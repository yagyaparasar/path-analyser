import { useEffect, useRef, useState } from 'react'
import './App.css'
import { Graph, generatePresetGraph, analyzeGraph } from './js/graph.js'
import { Renderer } from './js/renderer.js'
import { bfs, dfs, dijkstra, aStar, bellmanFord, ALGORITHMS } from './js/algorithms.js'

const ALGO_MAP = { bfs, dfs, dijkstra, aStar, bellmanFord }

function emptyStats() {
  return { visited: 0, explored: 0, pathCost: null, pathHops: null, steps: 0 }
}

function processEvent(ev, s) {
  const { graph, renderer } = s
  switch (ev.type) {
    case 'enqueue':
      if (graph.nodes.has(ev.nodeId)) renderer.setNodeState(ev.nodeId, 'enqueued')
      break
    case 'dequeue':
      if (graph.nodes.has(ev.nodeId)) renderer.setNodeState(ev.nodeId, 'visiting')
      break
    case 'visit':
      if (graph.nodes.has(ev.nodeId)) { renderer.setNodeState(ev.nodeId, 'visited'); s.stats.visited++ }
      break
    case 'explore':
      renderer.setEdgeState(ev.edgeId, 'explored'); s.stats.explored++
      break
    case 'relax':
      renderer.setEdgeState(ev.edgeId, 'relaxed')
      if (graph.nodes.has(ev.nodeId)) renderer.setNodeState(ev.nodeId, 'enqueued')
      break
    case 'path':
      renderer.highlightPath(ev.nodes, ev.edges)
      s.stats.pathCost = ev.distance ?? ev.nodes.length - 1
      s.stats.pathHops = ev.nodes.length
      break
    default: break
  }
}

function initAlgo(s, setStats, setRunning) {
  if (!s.source || !s.target) return false
  s.renderer.resetStates()
  s.stats = emptyStats()
  setStats({ ...s.stats })
  const fn = ALGO_MAP[s.algorithm]
  if (!fn) return false
  s.gen = fn(s.graph, s.source, s.target)
  s.running = true
  setRunning(true)
  return true
}

function stepAlgo(s, setStats, setRunning, setPlaying) {
  if (!s.gen) return false
  const r = s.gen.next()
  if (r.done) { finishAlgo(s, setStats, setRunning, setPlaying); return false }
  s.stats.steps++
  processEvent(r.value, s)
  setStats({ ...s.stats })
  return true
}

function pauseAlgo(s, setPlaying) {
  s.playing = false
  clearInterval(s.timer)
  s.timer = null
  setPlaying(false)
}

function playAlgo(s, setStats, setRunning, setPlaying) {
  if (!s.running) return
  s.playing = true
  setPlaying(true)
  s.timer = setInterval(() => {
    if (!stepAlgo(s, setStats, setRunning, setPlaying)) pauseAlgo(s, setPlaying)
  }, s.speed)
}

function finishAlgo(s, setStats, setRunning, setPlaying) {
  s.running = false; s.playing = false
  clearInterval(s.timer); s.timer = null
  setStats({ ...s.stats }); setRunning(false); setPlaying(false)
}

function resetAlgo(s, setStats, setRunning, setPlaying) {
  pauseAlgo(s, setPlaying)
  s.gen = null; s.running = false
  s.stats = emptyStats()
  s.renderer.resetStates()
  setStats({ ...s.stats }); setRunning(false)
}

export default function App() {
  const canvasRef = useRef(null)
  const appRef = useRef(null)

  const [nodeCount, setNodeCount] = useState(0)
  const [edgeCount, setEdgeCount] = useState(0)
  const [stats, setStats] = useState(emptyStats())
  const [algorithm, setAlgorithm] = useState('dijkstra')
  const [speed, setSpeed] = useState(150)
  const [running, setRunning] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [sourceId, setSourceId] = useState(null)
  const [targetId, setTargetId] = useState(null)
  const [nodeOptions, setNodeOptions] = useState([])
  const [graphAnalysis, setGraphAnalysis] = useState(null)
  const [warning, setWarning] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || appRef.current) return

    // Wait one frame so .canvas-container has its final layout dimensions
    const raf = requestAnimationFrame(() => {
      const graph = new Graph()
      generatePresetGraph(graph)

      const renderer = new Renderer(canvas, graph)
      renderer.resize()
      renderer.fitToView()

      const ids = Array.from(graph.nodes.keys())
      const src = ids[0]
      const tgt = ids[ids.length - 1]
      renderer.selectedSource = src
      renderer.selectedTarget = tgt

      const options = Array.from(graph.nodes.values()).map(n => ({ id: n.id, label: n.label }))
      setNodeOptions(options)
      setNodeCount(graph.nodes.size)
      setEdgeCount(graph.edges.size)
      setSourceId(src)
      setTargetId(tgt)

      // Initial graph analysis
      const analysis = analyzeGraph(graph)
      setGraphAnalysis(analysis)

      const s = {
        graph, renderer,
        gen: null, timer: null,
        algorithm: 'dijkstra',
        source: src, target: tgt,
        speed: 150,
        running: false, playing: false,
        stats: emptyStats(),
      }
      appRef.current = s

      canvas.addEventListener('click', e => {
        const r = canvas.getBoundingClientRect()
        const id = renderer.hitTestNode(e.clientX - r.left, e.clientY - r.top)
        if (!id) return
        if (!s.source || (s.source && s.target)) {
          s.source = id; renderer.selectedSource = id; setSourceId(id)
          s.target = null; renderer.selectedTarget = null; setTargetId(null)
          resetAlgo(s, setStats, setRunning, setPlaying)
        } else {
          if (id === s.source) return
          s.target = id; renderer.selectedTarget = id; setTargetId(id)
          resetAlgo(s, setStats, setRunning, setPlaying)
        }
      })

      window.addEventListener('resize', () => { renderer.resize(); renderer.fitToView() })
    })

    return () => cancelAnimationFrame(raf)
  }, [])

  // Keep mutable refs in sync with React state
  useEffect(() => { if (appRef.current) appRef.current.speed = speed }, [speed])
  useEffect(() => { if (appRef.current) appRef.current.algorithm = algorithm }, [algorithm])

  // Analyze graph and generate warnings when algorithm or graph changes
  useEffect(() => {
    if (!appRef.current) return
    const analysis = analyzeGraph(appRef.current.graph)
    setGraphAnalysis(analysis)

    // Generate warnings based on algorithm and graph properties
    const algoInfo = ALGORITHMS[algorithm]
    let newWarning = null

    if (algoInfo.requiresNonNegative && analysis.hasNegativeWeights) {
      newWarning = {
        type: 'error',
        message: `${algoInfo.name} cannot handle negative edge weights and may produce incorrect results. Use Bellman-Ford instead.`,
        suggestion: 'bellmanFord'
      }
    } else if (algorithm === 'bellmanFord' && !analysis.hasNegativeWeights && analysis.edgeCount > 0) {
      newWarning = {
        type: 'info',
        message: `Your graph has no negative weights. Dijkstra's or A* would be faster (O((V+E)log V) vs O(V×E)).`,
        suggestion: 'dijkstra'
      }
    } else if (algorithm === 'bfs' && analysis.maxWeight > analysis.minWeight && analysis.edgeCount > 0) {
      newWarning = {
        type: 'warning',
        message: 'BFS ignores edge weights and only counts hops. For weighted graphs, use Dijkstra or A* for optimal paths.',
        suggestion: 'dijkstra'
      }
    } else if (algorithm === 'dfs') {
      newWarning = {
        type: 'warning',
        message: 'DFS does not guarantee the shortest path. It explores depth-first and may find suboptimal routes.',
        suggestion: null
      }
    }

    setWarning(newWarning)
  }, [algorithm, nodeCount, edgeCount])

  function handleRun() {
    const s = appRef.current; if (!s) return
    if (s.running) { playAlgo(s, setStats, setRunning, setPlaying); return }
    if (initAlgo(s, setStats, setRunning)) playAlgo(s, setStats, setRunning, setPlaying)
  }

  function handleStep() {
    const s = appRef.current; if (!s) return
    if (!s.running) initAlgo(s, setStats, setRunning)
    stepAlgo(s, setStats, setRunning, setPlaying)
  }

  function handlePause() {
    const s = appRef.current; if (!s) return
    pauseAlgo(s, setPlaying)
  }

  function handleSkip() {
    const s = appRef.current; if (!s) return
    if (!s.running) initAlgo(s, setStats, setRunning)
    pauseAlgo(s, setPlaying)
    while (s.gen) {
      const r = s.gen.next(); if (r.done) break
      s.stats.steps++; processEvent(r.value, s)
    }
    finishAlgo(s, setStats, setRunning, setPlaying)
  }

  function handleReset() {
    const s = appRef.current; if (!s) return
    resetAlgo(s, setStats, setRunning, setPlaying)
  }

  function handleSourceChange(e) {
    const s = appRef.current; if (!s || !e.target.value) return
    s.source = e.target.value; s.renderer.selectedSource = e.target.value
    setSourceId(e.target.value)
    resetAlgo(s, setStats, setRunning, setPlaying)
  }

  function handleTargetChange(e) {
    const s = appRef.current; if (!s || !e.target.value) return
    if (e.target.value === s.source) return
    s.target = e.target.value; s.renderer.selectedTarget = e.target.value
    setTargetId(e.target.value)
    resetAlgo(s, setStats, setRunning, setPlaying)
  }

  function handleImport(e) {
    const file = e.target.files[0]; if (!file) return
    const s = appRef.current
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.nodes || !data.edges) throw new Error('Missing nodes/edges')
        resetAlgo(s, setStats, setRunning, setPlaying)
        s.graph.fromJSON(data)
        s.renderer.resetStates(); s.renderer.fitToView()
        s.source = null; s.target = null
        s.renderer.selectedSource = null; s.renderer.selectedTarget = null
        const options = Array.from(s.graph.nodes.values()).map(n => ({ id: n.id, label: n.label }))
        setNodeOptions(options)
        setNodeCount(s.graph.nodes.size); setEdgeCount(s.graph.edges.size)
        setSourceId(null); setTargetId(null)
        // Trigger analysis update
        const analysis = analyzeGraph(s.graph)
        setGraphAnalysis(analysis)
      } catch { /* invalid JSON */ }
    }
    reader.readAsText(file); e.target.value = ''
  }

  function handleExport() {
    const s = appRef.current; if (!s) return
    const json = JSON.stringify(s.graph.toJSON(), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'graph.json'; a.click()
    URL.revokeObjectURL(url)
  }

  function handleLoadPreset() {
    const s = appRef.current; if (!s) return
    resetAlgo(s, setStats, setRunning, setPlaying)
    s.graph.clear(); generatePresetGraph(s.graph)
    s.renderer.resetStates(); s.renderer.fitToView()
    const ids = Array.from(s.graph.nodes.keys())
    s.source = ids[0]; s.target = ids[ids.length - 1]
    s.renderer.selectedSource = s.source; s.renderer.selectedTarget = s.target
    const options = Array.from(s.graph.nodes.values()).map(n => ({ id: n.id, label: n.label }))
    setNodeOptions(options)
    setNodeCount(s.graph.nodes.size); setEdgeCount(s.graph.edges.size)
    setSourceId(s.source); setTargetId(s.target)
    // Trigger analysis update
    const analysis = analyzeGraph(s.graph)
    setGraphAnalysis(analysis)
  }

  const info = ALGORITHMS[algorithm]

  return (
    <>
      <div className="app">
        <header className="header">
          <div className="header-left">
            <h1 className="logo">◇ PathFinder</h1>
            <span className="subtitle">Shortest Path Algorithm Visualizer</span>
          </div>
          <div className="header-right">
            <span className="badge">{nodeCount} nodes</span>
            <span className="separator">•</span>
            <span className="badge">{edgeCount} edges</span>
          </div>
        </header>

        <main className="main">
          <aside className="sidebar">

            <section className="panel">
              <h3 className="panel-title">Algorithm</h3>
              <div className="algo-grid">
                {Object.entries(ALGORITHMS).map(([key, meta]) => (
                  <button
                    key={key}
                    className={`algo-btn${key === 'bellmanFord' ? ' wide' : ''}${algorithm === key ? ' active' : ''}`}
                    onClick={() => setAlgorithm(key)}
                  >
                    {meta.name}
                  </button>
                ))}
              </div>
              <div className="algo-info">
                <p className="algo-desc">{info.description}</p>
                <p className="algo-complexity">Time: <span>{info.complexity}</span></p>
              </div>
            </section>

            {warning && (
              <section className="panel">
                <div className={`warning-box ${warning.type}`}>
                  <div className="warning-icon">
                    {warning.type === 'error' && '⚠️'}
                    {warning.type === 'warning' && '⚡'}
                    {warning.type === 'info' && 'ℹ️'}
                  </div>
                  <div className="warning-content">
                    <p className="warning-message">{warning.message}</p>
                    {warning.suggestion && (
                      <button
                        className="warning-action"
                        onClick={() => setAlgorithm(warning.suggestion)}
                      >
                        Switch to {ALGORITHMS[warning.suggestion].name}
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            <section className="panel intelligence-panel">
              <h3 className="panel-title">Algorithm Intelligence</h3>
              <div className="intelligence-content">
                <div className="intel-section">
                  <div className="intel-label">✓ Best Use Case</div>
                  <div className="intel-value">{info.bestUseCase}</div>
                </div>
                <div className="intel-section">
                  <div className="intel-label">✗ Avoid When</div>
                  <div className="intel-value">{info.avoidWhen}</div>
                </div>
                <div className="intel-section">
                  <div className="intel-label">⏱ Complexity</div>
                  <div className="intel-complexity">
                    <div>Time: <span>{info.complexity}</span></div>
                    <div>Space: <span>{info.spaceComplexity}</span></div>
                  </div>
                </div>
                <div className="intel-section">
                  <div className="intel-label">🌍 Real-World Example</div>
                  <div className="intel-value intel-example">{info.realWorldExample}</div>
                </div>
              </div>
            </section>

            <section className="panel">
              <h3 className="panel-title">Nodes</h3>
              <div className="form-group">
                <label className="label source-label" htmlFor="source-select">⬤ Source</label>
                <select id="source-select" className="select" value={sourceId || ''} onChange={handleSourceChange}>
                  <option value="">Click a node or select…</option>
                  {nodeOptions.map(n => <option key={n.id} value={n.id}>{n.label} ({n.id})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label target-label" htmlFor="target-select">⬤ Target</label>
                <select id="target-select" className="select" value={targetId || ''} onChange={handleTargetChange}>
                  <option value="">Click a node or select…</option>
                  {nodeOptions.map(n => <option key={n.id} value={n.id}>{n.label} ({n.id})</option>)}
                </select>
              </div>
            </section>

            <section className="panel">
              <h3 className="panel-title">Controls</h3>
              <div className="controls">
                <button className="ctrl-btn primary" onClick={handleRun} disabled={running && playing}>▶ Run</button>
                <button className="ctrl-btn" onClick={handleStep}>⏭ Step</button>
                <button className="ctrl-btn" onClick={handlePause} disabled={!playing}>⏸ Pause</button>
                <button className="ctrl-btn" onClick={handleSkip}>⏩ Skip</button>
                <button className="ctrl-btn danger full-width" onClick={handleReset}>↺ Reset</button>
              </div>
              <div className="speed-control">
                <label className="label">Speed <span className="speed-val">{speed}ms</span></label>
                <input type="range" className="slider" min="5" max="800" step="5"
                  value={speed} onChange={e => setSpeed(+e.target.value)} />
                <div className="slider-labels"><span>Fast</span><span>Slow</span></div>
              </div>
            </section>

            <section className="panel">
              <h3 className="panel-title">Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item"><span className="stat-value">{stats.visited}</span><span className="stat-label">Visited</span></div>
                <div className="stat-item"><span className="stat-value">{stats.explored}</span><span className="stat-label">Edges</span></div>
                <div className="stat-item"><span className="stat-value">{stats.pathCost ?? '—'}</span><span className="stat-label">Path Cost</span></div>
                <div className="stat-item"><span className="stat-value">{stats.pathHops ?? '—'}</span><span className="stat-label">Path Hops</span></div>
                <div className="stat-item full-width"><span className="stat-value">{stats.steps}</span><span className="stat-label">Total Steps</span></div>
              </div>
            </section>

            <section className="panel">
              <h3 className="panel-title">Graph</h3>
              <div className="graph-actions">
                <button className="action-btn" onClick={() => document.getElementById('file-input').click()}>📂 Import JSON</button>
                <button className="action-btn" onClick={handleExport}>💾 Export JSON</button>
                <button className="action-btn" onClick={handleLoadPreset}>🔄 Load Preset</button>
              </div>
            </section>

            <section className="panel">
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

          <div className="canvas-container">
            <canvas ref={canvasRef} id="graph-canvas" />
            <div className="canvas-hint">Scroll to zoom · Drag to pan · Click nodes to select source / target</div>
          </div>
        </main>
      </div>

      <input type="file" id="file-input" accept=".json,application/json" hidden onChange={handleImport} />
    </>
  )
}
