/**
 * DependencyGraph - Manages dependency relationships and graph operations
 * 
 * Features:
 * - Graph construction and management
 * - Cycle detection
 * - Topological sorting
 * - Path finding
 * - Graph metrics calculation
 */

import {
  DependencyNode,
  DependencyEdge,
  DependencyType,
} from './types';

export class DependencyGraph {
  private nodes: Map<string, DependencyNode>;
  private edges: Map<string, DependencyEdge[]>;
  private adjacencyList: Map<string, string[]>;
  private reverseAdjacencyList: Map<string, string[]>;

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.adjacencyList = new Map();
    this.reverseAdjacencyList = new Map();
  }

  /**
   * Add a node to the graph
   */
  addNode(node: DependencyNode): void {
    this.nodes.set(node.id, node);
    
    // Initialize adjacency lists
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, []);
    }
    if (!this.reverseAdjacencyList.has(node.id)) {
      this.reverseAdjacencyList.set(node.id, []);
    }
  }

  /**
   * Add an edge to the graph
   */
  addEdge(from: string, to: string, type: DependencyType, weight: number = 1): void {
    // Ensure both nodes exist
    if (!this.nodes.has(from)) {
      throw new Error(`Source node ${from} does not exist`);
    }
    if (!this.nodes.has(to)) {
      throw new Error(`Target node ${to} does not exist`);
    }

    const edge: DependencyEdge = {
      from,
      to,
      type,
      weight,
      isDirect: true,
    };

    // Add to edges map
    if (!this.edges.has(from)) {
      this.edges.set(from, []);
    }
    this.edges.get(from)!.push(edge);

    // Update adjacency lists
    this.adjacencyList.get(from)!.push(to);
    this.reverseAdjacencyList.get(to)!.push(from);
  }

  /**
   * Remove an edge from the graph
   */
  removeEdge(from: string, to: string, type?: DependencyType): boolean {
    const edges = this.edges.get(from);
    if (!edges) {
      return false;
    }

    const initialLength = edges.length;
    const filteredEdges = edges.filter(edge => 
      edge.to === to && (type === undefined || edge.type === type)
    );

    this.edges.set(from, filteredEdges);
    
    // Update adjacency lists
    const adjList = this.adjacencyList.get(from);
    if (adjList) {
      const index = adjList.indexOf(to);
      if (index > -1) {
        adjList.splice(index, 1);
      }
    }

    const reverseAdjList = this.reverseAdjacencyList.get(to);
    if (reverseAdjList) {
      const index = reverseAdjList.indexOf(from);
      if (index > -1) {
        reverseAdjList.splice(index, 1);
      }
    }

    return filteredEdges.length < initialLength;
  }

  /**
   * Remove a node and all its edges
   */
  removeNode(nodeId: string): boolean {
    if (!this.nodes.has(nodeId)) {
      return false;
    }

    // Remove all edges involving this node
    const outgoingEdges = this.edges.get(nodeId) || [];
    for (const edge of outgoingEdges) {
      this.removeEdge(nodeId, edge.to, edge.type);
    }

    const incomingEdges = this.getEdges().filter(edge => edge.to === nodeId);
    for (const edge of incomingEdges) {
      this.removeEdge(edge.from, nodeId, edge.type);
    }

    // Remove node
    this.nodes.delete(nodeId);
    this.edges.delete(nodeId);
    this.adjacencyList.delete(nodeId);
    this.reverseAdjacencyList.delete(nodeId);

    return true;
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): DependencyNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): DependencyNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges
   */
  getEdges(from?: string): DependencyEdge[] {
    if (from) {
      return this.edges.get(from) || [];
    }
    
    const allEdges: DependencyEdge[] = [];
    for (const edges of this.edges.values()) {
      allEdges.push(...edges);
    }
    return allEdges;
  }

  /**
   * Get outgoing edges from a node
   */
  getOutgoingEdges(nodeId: string): DependencyEdge[] {
    return this.edges.get(nodeId) || [];
  }

  /**
   * Get incoming edges to a node
   */
  getIncomingEdges(nodeId: string): DependencyEdge[] {
    return this.getEdges().filter(edge => edge.to === nodeId);
  }

  /**
   * Check if a path exists between two nodes
   */
  hasPath(from: string, to: string): boolean {
    if (from === to) {
      return true;
    }

    const visited = new Set<string>();
    const queue = [from];

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current === to) {
        return true;
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return false;
  }

  /**
   * Find all paths between two nodes (up to maxDepth)
   */
  findAllPaths(from: string, to: string, maxDepth: number = 10): string[][] {
    const paths: string[][] = [];
    
    const dfs = (current: string, target: string, path: string[], visited: Set<string>, depth: number) => {
      if (depth > maxDepth) {
        return;
      }

      if (current === target) {
        paths.push([...path]);
        return;
      }

      if (visited.has(current)) {
        return;
      }

      visited.add(current);
      path.push(current);

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, target, path, visited, depth + 1);
      }

      path.pop();
      visited.delete(current);
    };

    dfs(from, to, [], new Set(), 0);
    return paths;
  }

  /**
   * Find the shortest path between two nodes
   */
  findShortestPath(from: string, to: string): string[] | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>(Array.from(this.nodes.keys()));

    // Initialize distances
    for (const nodeId of unvisited) {
      distances.set(nodeId, nodeId === from ? 0 : Infinity);
      previous.set(nodeId, null);
    }

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let current: string | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId)!;
        if (distance < minDistance) {
          minDistance = distance;
          current = nodeId;
        }
      }

      if (current === null || minDistance === Infinity) {
        break; // No more reachable nodes
      }

      if (current === to) {
        // Found shortest path
        const path: string[] = [];
        let node = current;
        
        while (node !== null) {
          path.unshift(node);
          node = previous.get(node)!;
        }
        
        return path;
      }

      unvisited.delete(current);

      // Update distances to neighbors
      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of unvisited) {
        const edgeWeight = this.getEdgeWeight(current, neighbor);
        const newDistance = distances.get(current)! + edgeWeight;
        
        if (newDistance < distances.get(neighbor)!) {
          distances.set(neighbor, newDistance);
          previous.set(neighbor, current);
        }
      }
    }

    return null; // No path found
  }

  /**
   * Find all cycles in the graph
   */
  findAllCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];

    const dfs = (nodeId: string) => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStartIndex = currentPath.indexOf(nodeId);
        if (cycleStartIndex !== -1) {
          const cycle = currentPath.slice(cycleStartIndex).concat(nodeId);
          cycles.push(cycle);
        }
        return;
      }

      if (visited.has(nodeId)) {
        return; // Already processed
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      currentPath.push(nodeId);

      const neighbors = this.adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor);
      }

      recursionStack.delete(nodeId);
      currentPath.pop();
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return cycles;
  }

  /**
   * Find cycles (alias for findAllCycles)
   */
  findCycles(): string[][] {
    return this.findAllCycles();
  }

  /**
   * Perform topological sort
   */
  topologicalSort(): string[] | null {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Calculate in-degrees
    for (const nodeId of this.nodes.keys()) {
      inDegree.set(nodeId, 0);
    }

    for (const [from, edges] of this.edges) {
      for (const edge of edges) {
        inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
      }
    }

    // Find nodes with in-degree 0
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Process nodes
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        const newInDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newInDegree);
        
        if (newInDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Check for cycles (if not all nodes are processed)
    if (result.length !== this.nodes.size) {
      return null; // Cycle detected
    }

    return result;
  }

  /**
   * Get nodes with no dependencies (roots)
   */
  getRootNodes(): string[] {
    const roots: string[] = [];
    
    for (const [nodeId, edges] of this.edges) {
      if (edges.length === 0) {
        roots.push(nodeId);
      }
    }
    
    return roots;
  }

  /**
   * Get nodes with no dependents (leaves)
   */
  getLeafNodes(): string[] {
    const leafNodeIds = new Set<string>();
    
    // Add all node IDs
    for (const nodeId of this.nodes.keys()) {
      leafNodeIds.add(nodeId);
    }
    
    // Remove nodes that have outgoing edges
    for (const [from] of this.edges) {
      leafNodeIds.delete(from);
    }
    
    return Array.from(leafNodeIds);
  }

  /**
   * Get strongly connected components
   */
  getStronglyConnectedComponents(): string[][] {
    // Using Kosaraju's algorithm
    const visited = new Set<string>();
    const stack: string[] = [];
    const components: string[][] = [];

    // First pass: get finish times
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        this.dfsFillOrder(nodeId, visited, stack);
      }
    }

    // Second pass: get components on reversed graph
    visited.clear();
    const reversedGraph = this.getReversedGraph();

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      
      if (!visited.has(nodeId)) {
        const component: string[] = [];
        this.dfsCollectComponent(nodeId, visited, reversedGraph, component);
        components.push(component);
      }
    }

    return components;
  }

  /**
   * Calculate graph metrics
   */
  getMetrics(): {
    nodeCount: number;
    edgeCount: number;
    density: number;
    averageDegree: number;
    isConnected: boolean;
    hasCycles: boolean;
    diameter?: number;
    averagePathLength?: number;
  } {
    const nodeCount = this.nodes.size;
    const edgeCount = this.getEdges().length;
    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
    
    const totalDegree = Array.from(this.adjacencyList.values())
      .reduce((sum, neighbors) => sum + neighbors.length, 0);
    const averageDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
    
    const isConnected = this.isConnected();
    const hasCycles = this.findAllCycles().length > 0;
    
    return {
      nodeCount,
      edgeCount,
      density,
      averageDegree,
      isConnected,
      hasCycles,
    };
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
  }

  // Private helper methods

  private getEdgeWeight(from: string, to: string): number {
    const edges = this.edges.get(from) || [];
    const edge = edges.find(e => e.to === to);
    return edge ? edge.weight : 1;
  }

  private isConnected(): boolean {
    if (this.nodes.size === 0) {
      return true;
    }

    const startNode = Array.from(this.nodes.keys())[0];
    const visited = new Set<string>();
    const queue = [startNode];

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return visited.size === this.nodes.size;
  }

  private getReversedGraph(): Map<string, string[]> {
    const reversed = new Map<string, string[]>();
    
    // Initialize all nodes
    for (const nodeId of this.nodes.keys()) {
      reversed.set(nodeId, []);
    }
    
    // Reverse edges
    for (const [from, edges] of this.edges) {
      for (const edge of edges) {
        const toNeighbors = reversed.get(edge.to) || [];
        toNeighbors.push(from);
        reversed.set(edge.to, toNeighbors);
      }
    }
    
    return reversed;
  }

  private dfsFillOrder(nodeId: string, visited: Set<string>, stack: string[]): void {
    visited.add(nodeId);
    
    const neighbors = this.adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.dfsFillOrder(neighbor, visited, stack);
      }
    }
    
    stack.push(nodeId);
  }

  private dfsCollectComponent(
    nodeId: string, 
    visited: Set<string>, 
    graph: Map<string, string[]>, 
    component: string[]
  ): void {
    visited.add(nodeId);
    component.push(nodeId);
    
    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.dfsCollectComponent(neighbor, visited, graph, component);
      }
    }
  }
}
