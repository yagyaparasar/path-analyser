// ─── Graph Data Structure ─────────────────────────────────────────
import Data from './data.json';

export class Graph {
  constructor() {
    this.nodes = new Map();   // id → { id, label, x, y }
    this.edges = new Map();   // id → { id, source, target, weight }
    this.directed = false;
    this._edgeCounter = 0;
  }

  addNode(id, label, x, y) {
    this.nodes.set(id, { id, label: label || id, x, y });
  }

  addEdge(sourceId, targetId, weight = 1) {
    const edgeId = `e${this._edgeCounter++}`;
    this.edges.set(edgeId, { id: edgeId, source: sourceId, target: targetId, weight });
    return edgeId;
  }

  getNeighbors(nodeId) {
    const neighbors = [];
    for (const [edgeId, edge] of this.edges) {
      if (edge.source === nodeId) {
        neighbors.push({ nodeId: edge.target, edgeId, weight: edge.weight });
      } else if (!this.directed && edge.target === nodeId) {
        neighbors.push({ nodeId: edge.source, edgeId, weight: edge.weight });
      }
    }
    return neighbors;
  }

  getEdgeBetween(a, b) {
    for (const [edgeId, edge] of this.edges) {
      if (edge.source === a && edge.target === b) return edgeId;
      if (!this.directed && edge.source === b && edge.target === a) return edgeId;
    }
    return null;
  }

  clear() {
    this.nodes.clear();
    this.edges.clear();
    this._edgeCounter = 0;
  }

  toJSON() {
    return {
      directed: this.directed,
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()).map(e => ({
        source: e.source,
        target: e.target,
        weight: e.weight
      }))
    };
  }

  fromJSON(data) {
    this.clear();
    this.directed = !!data.directed;
    for (const n of data.nodes) {
      this.addNode(n.id, n.label || n.id, n.x, n.y);
    }
    for (const e of data.edges) {
      this.addEdge(e.source, e.target, e.weight ?? 1);
    }
  }
}

// ─── Preset Graph Generator ───────────────────────────────────────
// Builds a dense metropolitan transit-style network (30 nodes, ~80+ edges)

export function generatePresetGraph(graph) {
  graph.clear();
  graph.directed = false;

  // Import nodes from data.json
  const nodes = Data.nodes;

  nodes.forEach(n => graph.addNode(n.id, n.label, n.x, n.y));

  // ── Auto-connect nearby nodes (distance < threshold) ──
  const THRESHOLD = 210;
  const added = new Set();

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < THRESHOLD) {
        const key = `${a.id}-${b.id}`;
        if (!added.has(key)) {
          const weight = Math.max(2, Math.round(dist / 18));
          graph.addEdge(a.id, b.id, weight);
          added.add(key);
        }
      }
    }
  }

  // ── Strategic long-distance connections from data.json ──
  const extras = Data.edges;

  extras.forEach(({ source, target, weight }) => {
    const key1 = `${source}-${target}`, key2 = `${target}-${source}`;
    if (!added.has(key1) && !added.has(key2)) {
      graph.addEdge(source, target, weight);
      added.add(key1);
    }
  });
}

// ─── Graph Analysis Utilities ─────────────────────────────────────

export function analyzeGraph(graph) {
  let hasNegativeWeights = false;
  let minWeight = Infinity;
  let maxWeight = -Infinity;
  let totalWeight = 0;
  let edgeCount = 0;

  for (const edge of graph.edges.values()) {
    if (edge.weight < 0) hasNegativeWeights = true;
    minWeight = Math.min(minWeight, edge.weight);
    maxWeight = Math.max(maxWeight, edge.weight);
    totalWeight += edge.weight;
    edgeCount++;
  }

  return {
    hasNegativeWeights,
    minWeight: edgeCount > 0 ? minWeight : 0,
    maxWeight: edgeCount > 0 ? maxWeight : 0,
    avgWeight: edgeCount > 0 ? totalWeight / edgeCount : 0,
    nodeCount: graph.nodes.size,
    edgeCount,
  };
}
