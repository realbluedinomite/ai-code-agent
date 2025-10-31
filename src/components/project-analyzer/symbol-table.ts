/**
 * SymbolTable - Manages symbol information and references
 * 
 * Features:
 * - Symbol storage and retrieval
 * - Reference tracking
 * - Dependency analysis
 * - Cross-reference generation
 */

import {
  Symbol,
  SymbolTableEntry,
  SymbolReference,
  SymbolDefinition,
  ModuleInfo,
} from './types';

export class SymbolTable {
  private symbols: Map<string, SymbolTableEntry>;
  private globalSymbols: Set<string>;
  private modules: Map<string, ModuleInfo>;
  private fileSymbols: Map<string, Set<string>>; // file -> symbols map

  constructor() {
    this.symbols = new Map();
    this.globalSymbols = new Set();
    this.modules = new Map();
    this.fileSymbols = new Map();
  }

  /**
   * Add a symbol to the table
   */
  addSymbol(symbol: Symbol): void {
    const key = this.getSymbolKey(symbol);
    
    let entry = this.symbols.get(key);
    
    if (!entry) {
      entry = {
        symbol: symbol,
        references: [],
        definition: this.createSymbolDefinition(symbol),
        dependencies: [],
        dependents: [],
      };
      this.symbols.set(key, entry);
    } else {
      // Update existing symbol
      entry.symbol = symbol;
    }
    
    // Add to file index
    this.addToFileIndex(symbol.location.file, key);
    
    // Track global symbols
    if (this.isGlobal(symbol)) {
      this.globalSymbols.add(key);
    }
  }

  /**
   * Get a symbol by name
   */
  getSymbol(name: string): SymbolTableEntry | undefined {
    return this.symbols.get(name);
  }

  /**
   * Get all symbols
   */
  getAllSymbols(): SymbolTableEntry[] {
    return Array.from(this.symbols.values());
  }

  /**
   * Get symbols by file
   */
  getSymbolsByFile(filePath: string): SymbolTableEntry[] {
    const symbolKeys = this.fileSymbols.get(filePath);
    if (!symbolKeys) {
      return [];
    }
    
    return Array.from(symbolKeys)
      .map(key => this.symbols.get(key))
      .filter((entry): entry is SymbolTableEntry => entry !== undefined);
  }

  /**
   * Get symbols by kind
   */
  getSymbolsByKind(kind: string): SymbolTableEntry[] {
    return Array.from(this.symbols.values()).filter(
      entry => this.getSymbolKindName(entry.symbol.kind) === kind
    );
  }

  /**
   * Add a reference to a symbol
   */
  addReference(symbolName: string, reference: SymbolReference): void {
    const entry = this.symbols.get(symbolName);
    if (entry) {
      entry.references.push(reference);
    }
  }

  /**
   * Get symbol references
   */
  getSymbolReferences(name: string): SymbolReference[] {
    const entry = this.symbols.get(name);
    return entry ? entry.references : [];
  }

  /**
   * Get symbol dependencies (symbols this symbol depends on)
   */
  getSymbolDependencies(name: string): string[] {
    const entry = this.symbols.get(name);
    return entry ? entry.dependencies : [];
  }

  /**
   * Get symbol dependents (symbols that depend on this symbol)
   */
  getSymbolDependents(name: string): string[] {
    const entry = this.symbols.get(name);
    return entry ? entry.dependents : [];
  }

  /**
   * Add dependency relationship
   */
  addDependency(fromSymbol: string, toSymbol: string): void {
    const from = this.symbols.get(fromSymbol);
    const to = this.symbols.get(toSymbol);
    
    if (from && to) {
      if (!from.dependencies.includes(toSymbol)) {
        from.dependencies.push(toSymbol);
      }
      
      if (!to.dependents.includes(fromSymbol)) {
        to.dependents.push(fromSymbol);
      }
    }
  }

  /**
   * Remove symbol
   */
  removeSymbol(symbolName: string): boolean {
    const entry = this.symbols.get(symbolName);
    if (!entry) {
      return false;
    }
    
    // Remove from file index
    this.removeFromFileIndex(entry.symbol.location.file, symbolName);
    
    // Remove from global symbols
    this.globalSymbols.delete(symbolName);
    
    // Remove dependencies
    for (const depName of entry.dependencies) {
      const dep = this.symbols.get(depName);
      if (dep) {
        dep.dependents = dep.dependents.filter(name => name !== symbolName);
      }
    }
    
    // Remove dependents
    for (const dependentName of entry.dependents) {
      const dependent = this.symbols.get(dependentName);
      if (dependent) {
        dependent.dependencies = dependent.dependencies.filter(name => name !== symbolName);
      }
    }
    
    // Remove from symbols map
    this.symbols.delete(symbolName);
    
    return true;
  }

  /**
   * Update symbol
   */
  updateSymbol(symbolName: string, updates: Partial<Symbol>): boolean {
    const entry = this.symbols.get(symbolName);
    if (!entry) {
      return false;
    }
    
    entry.symbol = { ...entry.symbol, ...updates };
    return true;
  }

  /**
   * Find symbols by pattern
   */
  findSymbols(pattern: string): SymbolTableEntry[] {
    const regex = new RegExp(pattern, 'i');
    return Array.from(this.symbols.values()).filter(entry =>
      regex.test(entry.symbol.name) || regex.test(entry.symbol.documentation || '')
    );
  }

  /**
   * Get exportable symbols (symbols that are exported)
   */
  getExportedSymbols(): SymbolTableEntry[] {
    return Array.from(this.symbols.values()).filter(entry => entry.symbol.isExported);
  }

  /**
   * Get symbols with most references
   */
  getMostReferencedSymbols(limit: number = 10): SymbolTableEntry[] {
    return Array.from(this.symbols.values())
      .sort((a, b) => b.references.length - a.references.length)
      .slice(0, limit);
  }

  /**
   * Get symbols with most dependencies
   */
  getMostDependentSymbols(limit: number = 10): SymbolTableEntry[] {
    return Array.from(this.symbols.values())
      .sort((a, b) => b.dependencies.length - a.dependencies.length)
      .slice(0, limit);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalSymbols: number;
    exportedSymbols: number;
    globalSymbols: number;
    totalReferences: number;
    symbolsByKind: Map<string, number>;
    symbolsByFile: Map<string, number>;
  } {
    const exportedCount = Array.from(this.symbols.values()).filter(
      entry => entry.symbol.isExported
    ).length;
    
    const totalReferences = Array.from(this.symbols.values()).reduce(
      (sum, entry) => sum + entry.references.length, 0
    );
    
    const symbolsByKind = new Map<string, number>();
    const symbolsByFile = new Map<string, number>();
    
    for (const entry of this.symbols.values()) {
      const kindName = this.getSymbolKindName(entry.symbol.kind);
      symbolsByKind.set(kindName, (symbolsByKind.get(kindName) || 0) + 1);
      
      const filePath = entry.symbol.location.file;
      symbolsByFile.set(filePath, (symbolsByFile.get(filePath) || 0) + 1);
    }
    
    return {
      totalSymbols: this.symbols.size,
      exportedSymbols: exportedCount,
      globalSymbols: this.globalSymbols.size,
      totalReferences,
      symbolsByKind,
      symbolsByFile,
    };
  }

  /**
   * Add module information
   */
  addModule(path: string, moduleInfo: ModuleInfo): void {
    this.modules.set(path, moduleInfo);
  }

  /**
   * Get module information
   */
  getModule(path: string): ModuleInfo | undefined {
    return this.modules.get(path);
  }

  /**
   * Get all modules
   */
  getAllModules(): ModuleInfo[] {
    return Array.from(this.modules.values());
  }

  /**
   * Clear all symbols
   */
  clear(): void {
    this.symbols.clear();
    this.globalSymbols.clear();
    this.modules.clear();
    this.fileSymbols.clear();
  }

  /**
   * Export symbols to JSON
   */
  exportToJSON(): any {
    return {
      symbols: Array.from(this.symbols.entries()).map(([name, entry]) => ({
        name,
        symbol: entry.symbol,
        references: entry.references,
        definition: entry.definition,
        dependencies: entry.dependencies,
        dependents: entry.dependents,
      })),
      globalSymbols: Array.from(this.globalSymbols),
      modules: Array.from(this.modules.entries()),
      statistics: this.getStatistics(),
    };
  }

  /**
   * Import symbols from JSON
   */
  importFromJSON(data: any): void {
    this.clear();
    
    if (data.symbols) {
      for (const item of data.symbols) {
        const entry: SymbolTableEntry = {
          symbol: item.symbol,
          references: item.references || [],
          definition: item.definition,
          dependencies: item.dependencies || [],
          dependents: item.dependents || [],
        };
        
        this.symbols.set(item.name, entry);
        this.addToFileIndex(item.symbol.location.file, item.name);
        
        if (this.isGlobal(item.symbol)) {
          this.globalSymbols.add(item.name);
        }
      }
    }
    
    if (data.globalSymbols) {
      for (const name of data.globalSymbols) {
        this.globalSymbols.add(name);
      }
    }
    
    if (data.modules) {
      for (const [path, moduleInfo] of data.modules) {
        this.modules.set(path, moduleInfo);
      }
    }
  }

  // Private helper methods

  private getSymbolKey(symbol: Symbol): string {
    // Use file path + symbol name for uniqueness
    return `${symbol.location.file}:${symbol.name}`;
  }

  private createSymbolDefinition(symbol: Symbol): SymbolDefinition {
    return {
      location: symbol.location,
      type: symbol.type,
    };
  }

  private isGlobal(symbol: Symbol): boolean {
    // Determine if symbol is global based on context
    // This is a simplified implementation
    return symbol.isExported || symbol.name.startsWith('global') || symbol.name === 'window' || symbol.name === 'document';
  }

  private getSymbolKindName(kind: any): string {
    // Convert TypeScript SymbolKind to string
    const kindNames: { [key: number]: string } = {
      [1]: 'Variable',
      [2]: 'Function',
      [3]: 'Class',
      [4]: 'Interface',
      [5]: 'Enum',
      [6]: 'EnumMember',
      [7]: 'TypeAlias',
      [8]: 'Property',
      [9]: 'Method',
      [10]: 'Constructor',
      [11]: 'GetAccessor',
      [12]: 'SetAccessor',
      [13]: 'CallSignature',
      [14]: 'IndexSignature',
      [15]: 'ConstructSignature',
      [16]: 'TypeParameter',
      [17]: 'Parameter',
      [18]: 'TypeLiteral',
      [19]: 'Accessor',
    };
    
    return kindNames[kind] || 'Unknown';
  }

  private addToFileIndex(filePath: string, symbolName: string): void {
    if (!this.fileSymbols.has(filePath)) {
      this.fileSymbols.set(filePath, new Set());
    }
    this.fileSymbols.get(filePath)!.add(symbolName);
  }

  private removeFromFileIndex(filePath: string, symbolName: string): void {
    const fileSet = this.fileSymbols.get(filePath);
    if (fileSet) {
      fileSet.delete(symbolName);
      if (fileSet.size === 0) {
        this.fileSymbols.delete(filePath);
      }
    }
  }
}
