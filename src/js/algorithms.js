// ─── Algorithm Metadata ───────────────────────────────────────────

export const ALGORITHMS = {
  dijkstra: {
    name: "Dijkstra's",
    description: 'Greedy algorithm using a priority queue. Guarantees shortest path with non-negative edge weights.',
    complexity: 'O((V + E) log V)',
  },
  aStar: {
    name: 'A*',
    description: 'Informed search using Euclidean distance heuristic to guide exploration towards the target. Optimal with admissible heuristic.',
    complexity: 'O((V + E) log V)',
  },
  bfs: {
    name: 'BFS',
    description: 'Explores all neighbors at the current depth before moving deeper. Guarantees shortest path in unweighted graphs.',
    complexity: 'O(V + E)',
  },
  dfs: {
    name: 'DFS',
    description: 'Explores as far as possible along each branch before backtracking. Does NOT guarantee the shortest path.',
    complexity: 'O(V + E)',
  },
  bellmanFord: {
    name: 'Bellman-Ford',
    description: 'Iteratively relaxes all edges V−1 times. Handles negative weights and detects negative cycles.',
    complexity: 'O(V × E)',
  },
};

// ─── Min-Heap (Priority Queue) ────────────────────────────────────

class MinHeap {
  constructor(cmp) {
    this.data = [];
    this.cmp = cmp || ((a, b) => a.priority - b.priority);
  }
  get size() { return this.data.length; }

  push(item) {
    this.data.push(item);
    this._up(this.data.length - 1);
  }

  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._down(0);
    }
    return top;
  }

  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.data[i], this.data[p]) >= 0) break;
      [this.data[i], this.data[p]] = [this.data[p], this.data[i]];
      i = p;
    }
  }

  _down(i) {
    const n = this.data.length;
    while (true) {
      let s = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.cmp(this.data[l], this.data[s]) < 0) s = l;
      if (r < n && this.cmp(this.data[r], this.data[s]) < 0) s = r;
      if (s === i) break;
      [this.data[i], this.data[s]] = [this.data[s], this.data[i]];
      i = s;
    }
  }
}

// ─── Path reconstruction helper ──────────────────────────────────

function reconstructPath(parent, parentEdge, sourceId, targetId) {
  const path = [];
  const edges = [];
  let node = targetId;
  while (node !== sourceId) {
    path.unshift(node);
    edges.unshift(parentEdge.get(node));
    node = parent.get(node);
    if (node === undefined) return null;          // unreachable
  }
  path.unshift(sourceId);
  return { nodes: path, edges };
}

// ─── BFS ──────────────────────────────────────────────────────────

export function* bfs(graph, sourceId, targetId) {
  if (sourceId === targetId) {
    yield { type: 'path', nodes: [sourceId], edges: [], distance: 0 };
    yield { type: 'done', found: true, distance: 0 };
    return;
  }

  const visited = new Set();
  const parent = new Map();
  const parentEdge = new Map();
  const queue = [sourceId];
  visited.add(sourceId);

  yield { type: 'enqueue', nodeId: sourceId };

  while (queue.length > 0) {
    const current = queue.shift();
    yield { type: 'dequeue', nodeId: current };

    if (current === targetId) {
      const res = reconstructPath(parent, parentEdge, sourceId, targetId);
      yield { type: 'path', nodes: res.nodes, edges: res.edges, distance: res.nodes.length - 1 };
      yield { type: 'done', found: true, distance: res.nodes.length - 1 };
      return;
    }

    yield { type: 'visit', nodeId: current };

    for (const nb of graph.getNeighbors(current)) {
      yield { type: 'explore', edgeId: nb.edgeId };
      if (!visited.has(nb.nodeId)) {
        visited.add(nb.nodeId);
        parent.set(nb.nodeId, current);
        parentEdge.set(nb.nodeId, nb.edgeId);
        queue.push(nb.nodeId);
        yield { type: 'enqueue', nodeId: nb.nodeId };
      }
    }
  }
  yield { type: 'done', found: false };
}

// ─── DFS ──────────────────────────────────────────────────────────

export function* dfs(graph, sourceId, targetId) {
  if (sourceId === targetId) {
    yield { type: 'path', nodes: [sourceId], edges: [], distance: 0 };
    yield { type: 'done', found: true, distance: 0 };
    return;
  }

  const visited = new Set();
  const parent = new Map();
  const parentEdge = new Map();
  const stack = [sourceId];

  yield { type: 'enqueue', nodeId: sourceId };

  while (stack.length > 0) {
    const current = stack.pop();
    if (visited.has(current)) continue;
    visited.add(current);

    yield { type: 'dequeue', nodeId: current };

    if (current === targetId) {
      const res = reconstructPath(parent, parentEdge, sourceId, targetId);
      yield { type: 'path', nodes: res.nodes, edges: res.edges, distance: res.nodes.length - 1 };
      yield { type: 'done', found: true, distance: res.nodes.length - 1 };
      return;
    }

    yield { type: 'visit', nodeId: current };

    for (const nb of graph.getNeighbors(current)) {
      yield { type: 'explore', edgeId: nb.edgeId };
      if (!visited.has(nb.nodeId)) {
        if (!parent.has(nb.nodeId)) {
          parent.set(nb.nodeId, current);
          parentEdge.set(nb.nodeId, nb.edgeId);
        }
        stack.push(nb.nodeId);
        yield { type: 'enqueue', nodeId: nb.nodeId };
      }
    }
  }
  yield { type: 'done', found: false };
}

// ─── Dijkstra ─────────────────────────────────────────────────────

export function* dijkstra(graph, sourceId, targetId) {
  if (sourceId === targetId) {
    yield { type: 'path', nodes: [sourceId], edges: [], distance: 0 };
    yield { type: 'done', found: true, distance: 0 };
    return;
  }

  const dist = new Map();
  const parent = new Map();
  const parentEdge = new Map();
  const visited = new Set();
  const pq = new MinHeap((a, b) => a.priority - b.priority);

  for (const [id] of graph.nodes) dist.set(id, Infinity);
  dist.set(sourceId, 0);
  pq.push({ nodeId: sourceId, priority: 0 });

  yield { type: 'enqueue', nodeId: sourceId };

  while (pq.size > 0) {
    const { nodeId: current } = pq.pop();
    if (visited.has(current)) continue;
    visited.add(current);

    yield { type: 'dequeue', nodeId: current };

    if (current === targetId) {
      const res = reconstructPath(parent, parentEdge, sourceId, targetId);
      const d = dist.get(targetId);
      yield { type: 'path', nodes: res.nodes, edges: res.edges, distance: d };
      yield { type: 'done', found: true, distance: d };
      return;
    }

    yield { type: 'visit', nodeId: current };

    for (const nb of graph.getNeighbors(current)) {
      yield { type: 'explore', edgeId: nb.edgeId };

      const alt = dist.get(current) + nb.weight;
      if (alt < dist.get(nb.nodeId)) {
        dist.set(nb.nodeId, alt);
        parent.set(nb.nodeId, current);
        parentEdge.set(nb.nodeId, nb.edgeId);
        pq.push({ nodeId: nb.nodeId, priority: alt });
        yield { type: 'relax', nodeId: nb.nodeId, edgeId: nb.edgeId, distance: alt };
      }
    }
  }
  yield { type: 'done', found: false };
}

// ─── A* ───────────────────────────────────────────────────────────

export function* aStar(graph, sourceId, targetId) {
  if (sourceId === targetId) {
    yield { type: 'path', nodes: [sourceId], edges: [], distance: 0 };
    yield { type: 'done', found: true, distance: 0 };
    return;
  }

  const tgt = graph.nodes.get(targetId);
  // Admissible heuristic: Euclidean distance scaled conservatively
  const h = (nodeId) => {
    const n = graph.nodes.get(nodeId);
    const dx = n.x - tgt.x;
    const dy = n.y - tgt.y;
    return Math.sqrt(dx * dx + dy * dy) / 22;   // ÷22 ensures admissibility with weight=dist/18
  };

  const gScore = new Map();
  const fScore = new Map();
  const parent = new Map();
  const parentEdge = new Map();
  const visited = new Set();
  const pq = new MinHeap((a, b) => a.priority - b.priority);

  for (const [id] of graph.nodes) {
    gScore.set(id, Infinity);
    fScore.set(id, Infinity);
  }

  gScore.set(sourceId, 0);
  fScore.set(sourceId, h(sourceId));
  pq.push({ nodeId: sourceId, priority: fScore.get(sourceId) });

  yield { type: 'enqueue', nodeId: sourceId };

  while (pq.size > 0) {
    const { nodeId: current } = pq.pop();
    if (visited.has(current)) continue;
    visited.add(current);

    yield { type: 'dequeue', nodeId: current };

    if (current === targetId) {
      const res = reconstructPath(parent, parentEdge, sourceId, targetId);
      const d = gScore.get(targetId);
      yield { type: 'path', nodes: res.nodes, edges: res.edges, distance: d };
      yield { type: 'done', found: true, distance: d };
      return;
    }

    yield { type: 'visit', nodeId: current };

    for (const nb of graph.getNeighbors(current)) {
      yield { type: 'explore', edgeId: nb.edgeId };

      const tentG = gScore.get(current) + nb.weight;
      if (tentG < gScore.get(nb.nodeId)) {
        parent.set(nb.nodeId, current);
        parentEdge.set(nb.nodeId, nb.edgeId);
        gScore.set(nb.nodeId, tentG);
        fScore.set(nb.nodeId, tentG + h(nb.nodeId));
        pq.push({ nodeId: nb.nodeId, priority: fScore.get(nb.nodeId) });
        yield { type: 'relax', nodeId: nb.nodeId, edgeId: nb.edgeId, distance: tentG };
      }
    }
  }
  yield { type: 'done', found: false };
}

// ─── Bellman-Ford ─────────────────────────────────────────────────

export function* bellmanFord(graph, sourceId, targetId) {
  if (sourceId === targetId) {
    yield { type: 'path', nodes: [sourceId], edges: [], distance: 0 };
    yield { type: 'done', found: true, distance: 0 };
    return;
  }

  const nodeIds = Array.from(graph.nodes.keys());
  const edgeList = Array.from(graph.edges.values());

  const dist = new Map();
  const parent = new Map();
  const parentEdge = new Map();

  for (const id of nodeIds) dist.set(id, Infinity);
  dist.set(sourceId, 0);

  yield { type: 'enqueue', nodeId: sourceId };
  yield { type: 'visit', nodeId: sourceId };

  for (let i = 0; i < nodeIds.length - 1; i++) {
    let anyRelaxed = false;

    for (const edge of edgeList) {
      // Build direction pairs (both for undirected)
      const pairs = [[edge.source, edge.target]];
      if (!graph.directed) pairs.push([edge.target, edge.source]);

      for (const [u, v] of pairs) {
        if (dist.get(u) === Infinity) continue;

        const newDist = dist.get(u) + edge.weight;
        if (newDist < dist.get(v)) {
          dist.set(v, newDist);
          parent.set(v, u);
          parentEdge.set(v, edge.id);
          anyRelaxed = true;

          yield { type: 'explore', edgeId: edge.id };
          yield { type: 'relax', nodeId: v, edgeId: edge.id, distance: newDist };
        }
      }
    }

    if (!anyRelaxed) break;            // early termination – no changes this round
  }

  // Mark all reachable nodes as visited
  for (const id of nodeIds) {
    if (dist.get(id) < Infinity && id !== sourceId) {
      yield { type: 'visit', nodeId: id };
    }
  }

  if (dist.get(targetId) < Infinity) {
    const res = reconstructPath(parent, parentEdge, sourceId, targetId);
    if (res) {
      yield { type: 'path', nodes: res.nodes, edges: res.edges, distance: dist.get(targetId) };
      yield { type: 'done', found: true, distance: dist.get(targetId) };
      return;
    }
  }
  yield { type: 'done', found: false };
}
