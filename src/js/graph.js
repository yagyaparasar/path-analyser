// ─── Graph Data Structure ─────────────────────────────────────────

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

  const nodes = [
    // ── Northwest cluster ──
    { id: 'APT', label: 'Airport',    x: 85,  y: 90  },
    { id: 'NTH', label: 'Northgate',  x: 250, y: 52  },
    { id: 'UNI', label: 'University', x: 145, y: 205 },
    // ── North-central ──
    { id: 'TPK', label: 'Tech Park',  x: 380, y: 115 },
    { id: 'ARN', label: 'Arena',      x: 505, y: 72  },
    { id: 'MSM', label: 'Museum',     x: 435, y: 190 },
    // ── Northeast cluster ──
    { id: 'STD', label: 'Stadium',    x: 655, y: 62  },
    { id: 'RDG', label: 'Ridge',      x: 775, y: 108 },
    { id: 'HTP', label: 'Hilltop',    x: 920, y: 78  },
    // ── West ──
    { id: 'WST', label: 'Westfield',  x: 52,  y: 345 },
    { id: 'MAL', label: 'Mall',       x: 172, y: 325 },
    // ── Center ──
    { id: 'CTR', label: 'Central',    x: 340, y: 300 },
    { id: 'MKT', label: 'Market',     x: 510, y: 255 },
    { id: 'LIB', label: 'Library',    x: 660, y: 210 },
    // ── Mid-center ──
    { id: 'DWN', label: 'Downtown',   x: 475, y: 380 },
    { id: 'PLZ', label: 'Plaza',      x: 635, y: 355 },
    // ── East ──
    { id: 'EST', label: 'Eastside',   x: 850, y: 265 },
    { id: 'VLY', label: 'Valley',     x: 975, y: 325 },
    // ── Southwest ──
    { id: 'GDN', label: 'Garden',     x: 52,  y: 485 },
    { id: 'PRK', label: 'Park',       x: 175, y: 470 },
    { id: 'STN', label: 'Station',    x: 325, y: 440 },
    // ── South-center ──
    { id: 'ZOO', label: 'Zoo',        x: 530, y: 505 },
    { id: 'LKE', label: 'Lake',       x: 330, y: 565 },
    // ── Southeast ──
    { id: 'HBR', label: 'Harbor',     x: 810, y: 395 },
    { id: 'PIR', label: 'Pier',       x: 720, y: 485 },
    { id: 'LHT', label: 'Lighthouse', x: 885, y: 485 },
    // ── Far south ──
    { id: 'CRK', label: 'Creek',      x: 130, y: 590 },
    { id: 'DPT', label: 'Depot',      x: 52,  y: 590 },
    { id: 'BCH', label: 'Beach',      x: 480, y: 620 },
    { id: 'MRN', label: 'Marina',     x: 680, y: 582 },
  ];

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

  // ── Strategic long-distance connections for extra density ──
  const extras = [
    ['APT', 'WST',  15], ['NTH', 'ARN',   14], ['HTP', 'VLY',  14],
    ['UNI', 'CTR',  12], ['STD', 'LIB',   8 ], ['RDG', 'EST',   9],
    ['MAL', 'STN',  10], ['CTR', 'DWN',   7 ], ['PLZ', 'HBR',  11],
    ['DWN', 'ZOO',   8], ['PRK', 'LKE',  10], ['ZOO', 'PIR',  13],
    ['PIR', 'MRN',   7], ['LKE', 'BCH',  10], ['BCH', 'MRN',  12],
    ['GDN', 'DPT',   6], ['CRK', 'LKE',  11], ['LHT', 'VLY',  13],
    ['ARN', 'MKT',   11], ['MSM', 'DWN',  12], ['TPK', 'MSM',   6],
  ];

  extras.forEach(([a, b, w]) => {
    const key1 = `${a}-${b}`, key2 = `${b}-${a}`;
    if (!added.has(key1) && !added.has(key2)) {
      graph.addEdge(a, b, w);
      added.add(key1);
    }
  });
}
