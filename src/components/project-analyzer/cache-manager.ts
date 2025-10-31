/**
 * CacheManager - Smart caching with file modification tracking
 * 
 * Features:
 * - File modification detection using timestamps and hashes
 * - LRU cache eviction with configurable TTL
 * - Persistent cache support
 * - Compression for large data
 * - Performance metrics tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { CacheOptions, CacheStats, FileModificationInfo } from './types';

export class CacheManager {
  private cache: Map<string, CacheEntry>;
  private stats: CacheStats;
  private options: Required<CacheOptions>;
  private accessOrder: string[];
  private fileIndex: Map<string, string>; // file path -> cache key
  private compressionEnabled: boolean;

  constructor(options: CacheOptions = { enabled: true, maxSize: 100, ttl: 3600000 }) {
    this.options = {
      enabled: options.enabled ?? true,
      maxSize: options.maxSize ?? 100,
      ttl: options.ttl ?? 3600000, // 1 hour default
      checkModifications: options.checkModifications ?? true,
      compression: options.compression ?? true,
      persistent: options.persistent ?? false,
      cacheDir: options.cacheDir ?? path.join(process.cwd(), '.cache', 'project-analyzer'),
    };
    
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      maxSize: this.options.maxSize,
      entries: 0,
      evictions: 0,
    };
    
    this.accessOrder = [];
    this.fileIndex = new Map();
    this.compressionEnabled = this.options.compression;

    if (this.options.persistent) {
      this.loadPersistentCache();
    }
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | undefined {
    if (!this.options.enabled) {
      return undefined;
    }

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.options.ttl) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Check file modifications if enabled
    if (this.options.checkModifications && entry.fileInfo) {
      const currentFileInfo = this.getFileInfo(entry.fileInfo.path);
      
      if (!currentFileInfo || 
          currentFileInfo.lastModified !== entry.fileInfo.lastModified ||
          currentFileInfo.size !== entry.fileInfo.size ||
          currentFileInfo.hash !== entry.fileInfo.hash) {
        this.delete(key);
        this.stats.misses++;
        this.updateHitRate();
        return undefined;
      }
    }

    // Update access order
    this.updateAccessOrder(key);
    
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, fileInfo?: FileModificationInfo): void {
    if (!this.options.enabled) {
      return;
    }

    // Check if cache is full
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    // Serialize and possibly compress data
    const serializedData = JSON.stringify(data);
    const processedData = this.compressionEnabled && serializedData.length > 1024 
      ? this.compress(serializedData)
      : serializedData;

    const entry: CacheEntry = {
      data: processedData,
      timestamp: Date.now(),
      fileInfo,
      compressed: this.compressionEnabled && processedData !== serializedData,
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    
    // Update file index
    if (fileInfo) {
      this.fileIndex.set(fileInfo.path, key);
    }
    
    this.updateStats();
    
    // Save to persistent storage
    if (this.options.persistent) {
      this.saveToDisk(key, entry);
    }
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.removeFromAccessOrder(key);
    
    // Remove from file index
    if (entry.fileInfo) {
      this.fileIndex.delete(entry.fileInfo.path);
    }
    
    this.updateStats();
    
    if (this.options.persistent) {
      this.removeFromDisk(key);
    }
    
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.fileIndex.clear();
    this.stats = {
      ...this.stats,
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      entries: 0,
      evictions: 0,
    };
    
    if (this.options.persistent) {
      this.clearPersistentCache();
    }
  }

  /**
   * Invalidate cache entries for specific files
   */
  invalidateFiles(filePaths: string[]): void {
    const keysToDelete: string[] = [];
    
    for (const filePath of filePaths) {
      const key = this.fileIndex.get(filePath);
      if (key) {
        keysToDelete.push(key);
      }
      
      // Also check for pattern-based keys
      const pattern = path.basename(filePath).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      for (const cacheKey of this.cache.keys()) {
        if (cacheKey.includes(pattern)) {
          keysToDelete.push(cacheKey);
        }
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache entry information
   */
  getEntryInfo(key: string): { timestamp: number; size: number; fileInfo?: FileModificationInfo } | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    return {
      timestamp: entry.timestamp,
      size: this.calculateEntrySize(entry),
      fileInfo: entry.fileInfo,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.options.ttl) {
        this.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Update cache options
   */
  updateOptions(newOptions: Partial<CacheOptions>): void {
    this.options = {
      ...this.options,
      ...newOptions,
    };
    
    this.stats.maxSize = this.options.maxSize;
    
    // Evict entries if max size decreased
    while (this.cache.size > this.options.maxSize) {
      this.evictLRU();
    }
  }

  /**
   * Compress data using gzip
   */
  private compress(data: string): string {
    try {
      const compressed = crypto.createGzip().update(data).digest('base64');
      return `gz:${compressed}`;
    } catch (error) {
      console.warn('Compression failed, storing uncompressed:', error);
      return data;
    }
  }

  /**
   * Decompress data
   */
  private decompress(data: string): string {
    if (!data.startsWith('gz:')) {
      return data;
    }
    
    try {
      const compressed = data.slice(3);
      return crypto.createGunzip().update(Buffer.from(compressed, 'base64')).toString();
    } catch (error) {
      console.error('Decompression failed:', error);
      throw new Error('Failed to decompress cached data');
    }
  }

  /**
   * Get file information for modification tracking
   */
  private getFileInfo(filePath: string): FileModificationInfo | undefined {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      
      return {
        path: filePath,
        lastModified: stats.mtime.getTime(),
        size: stats.size,
        hash,
        dependencies: [], // Will be populated by FileAnalyzer
      };
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Remove from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }
    
    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * Calculate entry size
   */
  private calculateEntrySize(entry: CacheEntry): number {
    const serialized = JSON.stringify(entry.data);
    const compressed = this.compressionEnabled ? this.compress(serialized) : serialized;
    return Buffer.byteLength(compressed, 'utf8');
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += this.calculateEntrySize(entry);
    }
    
    this.stats.size = totalSize;
    this.stats.entries = this.cache.size;
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Load persistent cache from disk
   */
  private loadPersistentCache(): void {
    try {
      if (!fs.existsSync(this.options.cacheDir)) {
        fs.mkdirSync(this.options.cacheDir, { recursive: true });
        return;
      }

      const files = fs.readdirSync(this.options.cacheDir);
      const now = Date.now();
      
      for (const file of files) {
        if (file.endsWith('.cache')) {
          const key = file.replace('.cache', '');
          const filePath = path.join(this.options.cacheDir, file);
          
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const entry: CacheEntry = JSON.parse(content);
            
            // Check TTL
            if (now - entry.timestamp <= this.options.ttl) {
              // Decompress if needed
              if (typeof entry.data === 'string' && entry.data.startsWith('gz:')) {
                try {
                  entry.data = this.decompress(entry.data);
                } catch (error) {
                  console.warn(`Failed to decompress ${key}, skipping:`, error);
                  continue;
                }
              }
              
              this.cache.set(key, entry);
              this.accessOrder.push(key);
              
              // Rebuild file index
              if (entry.fileInfo) {
                this.fileIndex.set(entry.fileInfo.path, key);
              }
            } else {
              // Delete expired file
              fs.unlinkSync(filePath);
            }
          } catch (error) {
            console.warn(`Failed to load cache entry ${key}:`, error);
          }
        }
      }
      
      this.updateStats();
    } catch (error) {
      console.error('Failed to load persistent cache:', error);
    }
  }

  /**
   * Save cache entry to disk
   */
  private saveToDisk(key: string, entry: CacheEntry): void {
    try {
      if (!fs.existsSync(this.options.cacheDir)) {
        fs.mkdirSync(this.options.cacheDir, { recursive: true });
      }

      const filePath = path.join(this.options.cacheDir, `${key}.cache`);
      fs.writeFileSync(filePath, JSON.stringify(entry));
    } catch (error) {
      console.error(`Failed to save cache entry ${key} to disk:`, error);
    }
  }

  /**
   * Remove cache entry from disk
   */
  private removeFromDisk(key: string): void {
    try {
      const filePath = path.join(this.options.cacheDir, `${key}.cache`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to remove cache entry ${key} from disk:`, error);
    }
  }

  /**
   * Clear persistent cache
   */
  private clearPersistentCache(): void {
    try {
      if (fs.existsSync(this.options.cacheDir)) {
        const files = fs.readdirSync(this.options.cacheDir);
        for (const file of files) {
          if (file.endsWith('.cache')) {
            fs.unlinkSync(path.join(this.options.cacheDir, file));
          }
        }
      }
    } catch (error) {
      console.error('Failed to clear persistent cache:', error);
    }
  }
}

interface CacheEntry {
  data: string;
  timestamp: number;
  fileInfo?: FileModificationInfo;
  compressed?: boolean;
}
