import React from 'react'
import { useEffect } from 'react'
import { useState } from 'react'
import './App.css'


function App() {
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);

  useEffect(() => {
    // Initialize node and edge counts
    setNodeCount(0);
    setEdgeCount(0);
  }, []);

  return (
    <>
      <div className="app">
        <header className="header" id="app-header">
          <div className="header-left">
            <h1 className="logo">◇ PathFinder</h1>
            <span className="subtitle">Shortest Path Algorithm Visualizer</span>
          </div>
          <div className="header-right">
            <span className="badge" id="node-count">{nodeCount} nodes</span>
            <span className="separator">•</span>
            <span className="badge" id="edge-count">{edgeCount} edges</span>
          </div>
        </header>

        <main className="main">

          <aside className="sidebar" id="sidebar">


            <section className="panel" id="panel-algorithm">
              <h3 className="panel-title">Algorithm</h3>
              <div className="algo-grid" id="algo-grid">
                <button className="algo-btn active" data-algo="dijkstra" id="algo-dijkstra">Dijkstra</button>
                <button className="algo-btn" data-algo="aStar" id="algo-astar">A*</button>
                <button className="algo-btn" data-algo="bfs" id="algo-bfs">BFS</button>
                <button className="algo-btn" data-algo="dfs" id="algo-dfs">DFS</button>
                <button className="algo-btn wide" data-algo="bellmanFord" id="algo-bellman">Bellman-Ford</button>
              </div>
              <div className="algo-info" id="algo-info">
                <p className="algo-desc" id="algo-description">Greedy algorithm using a priority queue. Guarantees shortest path with non-negative weights.</p>
                <p className="algo-complexity">Time: <span id="algo-complexity">O((V + E) log V)</span></p>
              </div>
            </section>


            <section className="panel" id="panel-nodes">
              <h3 className="panel-title">Nodes</h3>
              <div className="form-group">
                <label className="label source-label" htmlFor="source-select">⬤ Source</label>
                <select id="source-select" className="select">
                  <option value="">Click a node or select…</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label target-label" htmlFor="target-select">⬤ Target</label>
                <select id="target-select" className="select">
                  <option value="">Click a node or select…</option>
                </select>
              </div>
            </section>


            <section className="panel" id="panel-controls">
              <h3 className="panel-title">Controls</h3>
              <div className="controls" id="controls">
                <button className="ctrl-btn primary" id="btn-run" title="Run Algorithm">▶ Run</button>
                <button className="ctrl-btn" id="btn-step" title="Step Forward">⏭ Step</button>
                <button className="ctrl-btn" id="btn-pause" title="Pause" disabled>⏸ Pause</button>
                <button className="ctrl-btn" id="btn-skip" title="Skip to End">⏩ Skip</button>
                <button className="ctrl-btn danger full-width" id="btn-reset" title="Reset">↺ Reset</button>
              </div>
              <div className="speed-control">
                <label className="label">Speed <span id="speed-value" className="speed-val">150ms</span></label>
                <input type="range" id="speed-slider" className="slider" min="5" max="800" value="150" step="5" />
                <div className="slider-labels">
                  <span>Fast</span>
                  <span>Slow</span>
                </div>
              </div>
            </section>


            <section className="panel" id="panel-stats">
              <h3 className="panel-title">Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value" id="stat-visited">0</span>
                  <span className="stat-label">Visited</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value" id="stat-explored">0</span>
                  <span className="stat-label">Edges</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value" id="stat-path-length">—</span>
                  <span className="stat-label">Path Cost</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value" id="stat-path-nodes">—</span>
                  <span className="stat-label">Path Hops</span>
                </div>
                <div className="stat-item full-width">
                  <span className="stat-value" id="stat-steps">0</span>
                  <span className="stat-label">Total Steps</span>
                </div>
              </div>
            </section>


            <section className="panel" id="panel-graph">
              <h3 className="panel-title">Graph</h3>
              <div className="graph-actions">
                <button className="action-btn" id="btn-import" title="Import graph from JSON file">📂 Import JSON</button>
                <button className="action-btn" id="btn-export" title="Export current graph as JSON">💾 Export JSON</button>
                <button className="action-btn" id="btn-preset" title="Reload the built-in preset graph">🔄 Load Preset</button>
              </div>
            </section>


            <section className="panel" id="panel-legend">
              <h3 className="panel-title">Legend</h3>
              <div className="legend">
                <div className="legend-item"><span className="legend-dot source"></span> Source</div>
                <div className="legend-item"><span className="legend-dot target"></span> Target</div>
                <div className="legend-item"><span className="legend-dot enqueued"></span> In Queue</div>
                <div className="legend-item"><span className="legend-dot visiting"></span> Processing</div>
                <div className="legend-item"><span className="legend-dot visited"></span> Visited</div>
                <div className="legend-item"><span className="legend-dot path"></span> Shortest Path</div>
              </div>
            </section>
          </aside>


          <div className="canvas-container" id="canvas-container">
            <canvas id="graph-canvas"></canvas>
            <div className="canvas-hint" id="canvas-hint">Scroll to zoom · Drag to pan · Click nodes to select source / target</div>
          </div>
        </main>
      </div>


      <div className="notifications" id="notifications"></div>


      <input type="file" id="file-input" accept=".json,application/json" hidden />
    </>
  )
}

export default App;