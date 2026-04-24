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
      s.pathData = { nodes: ev.nodes, edges: ev.edges, distance: ev.distance }
      break
    default: break
  }
}

function initAlgo(s, setStats, setRunning) {
  if (!s.source || !s.target) return false
  s.renderer.resetStates()
  s.stats = emptyStats()
  s.pathData = null
  setStats({ ...s.stats })
  const fn = ALGO_MAP[s.algorithm]
  if (!fn) return false
  s.gen = fn(s.graph, s.source, s.target)
  s.running = true
  setRunning(true)
  return true
}

function stepAlgo(s, setStats, setRunning, setPlaying, setPathStory, setPathData) {
  if (!s.gen) return false
  const r = s.gen.next()
  if (r.done) { finishAlgo(s, setStats, setRunning, setPlaying, setPathStory, setPathData); return false }
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

function playAlgo(s, setStats, setRunning, setPlaying, setPathStory, setPathData) {
  if (!s.running) return
  s.playing = true
  setPlaying(true)
  s.timer = setInterval(() => {
    if (!stepAlgo(s, setStats, setRunning, setPlaying, setPathStory, setPathData)) pauseAlgo(s, setPlaying)
  }, s.speed)
}

function finishAlgo(s, setStats, setRunning, setPlaying, setPathStory, setPathData) {
  s.running = false; s.playing = false
  clearInterval(s.timer); s.timer = null
  setStats({ ...s.stats }); setRunning(false); setPlaying(false)
  
  if (s.pathData) {
    const story = generatePathStory(s.graph, s.pathData, s.algorithm, s.stats, s.source, s.target)
    setPathStory(story)
    setPathData(s.pathData)
  }
}

function resetAlgo(s, setStats, setRunning, setPlaying) {
  pauseAlgo(s, setPlaying)
  s.gen = null; s.running = false
  s.stats = emptyStats()
  s.pathData = null
  s.renderer.resetStates()
  setStats({ ...s.stats }); setRunning(false)
}

function generatePathStory(graph, pathData, algorithm, stats, sourceId, targetId) {
  const { nodes, edges, distance } = pathData
  
  const edgeWeights = edges.map(eid => {
    const edge = graph.edges.get(eid)
    return edge ? edge.weight : 0
  })
  
  const maxWeight = Math.max(...edgeWeights)
  const minWeight = Math.min(...edgeWeights)
  const avgWeight = edgeWeights.reduce((a, b) => a + b, 0) / edgeWeights.length
  
  const maxWeightIdx = edgeWeights.indexOf(maxWeight)
  const expensiveEdge = edges[maxWeightIdx]
  const expensiveEdgeObj = graph.edges.get(expensiveEdge)
  
  const directDistance = nodes.length - 1
  const efficiency = stats.visited / graph.nodes.size
  
  let narrative = ''
  let approach = ''
  
  switch (algorithm) {
    case 'dijkstra':
      approach = efficiency < 0.3 ? 'took a very direct route' : efficiency < 0.6 ? 'explored efficiently' : 'thoroughly examined alternatives'
      narrative = `Dijkstra's algorithm ${approach}, visiting ${stats.visited} nodes to find the optimal path. `
      if (maxWeight > avgWeight * 1.5) {
        narrative += `It navigated around some heavy edges, though it had to cross one costly connection (weight ${maxWeight}). `
      } else {
        narrative += `The path maintains relatively balanced edge weights. `
      }
      break
    case 'aStar':
      approach = efficiency < 0.25 ? 'made a beeline' : efficiency < 0.5 ? 'navigated smartly' : 'explored carefully'
      narrative = `A* ${approach} toward the target using spatial heuristics, checking only ${stats.visited} nodes. `
      narrative += `The heuristic guided it ${efficiency < 0.3 ? 'almost perfectly' : 'quite well'}, avoiding unnecessary exploration. `
      break
    case 'bfs':
      narrative = `BFS explored ${stats.visited} nodes in expanding waves, finding a path with ${nodes.length} hops. `
      if (edgeWeights.some(w => w > avgWeight * 1.5)) {
        narrative += `Note: BFS ignores edge weights, so this path may not be cost-optimal. `
      }
      break
    case 'dfs':
      narrative = `DFS dove deep into the graph, visiting ${stats.visited} nodes before finding a path. `
      narrative += `This path has ${nodes.length} hops, but DFS doesn't guarantee it's the shortest. `
      break
    case 'bellmanFord':
      narrative = `Bellman-Ford systematically relaxed edges ${Math.ceil(stats.steps / graph.edges.size)} times, `
      narrative += `visiting ${stats.visited} nodes to guarantee the optimal path even with negative weights. `
      break
  }
  
  if (nodes.length <= 4) {
    narrative += `The path is remarkably short—just ${nodes.length} nodes! `
  } else if (nodes.length > directDistance * 1.5) {
    narrative += `The path took a bit of a detour (${nodes.length} nodes). `
  }
  
  const avgDegree = (graph.edges.size * 2) / graph.nodes.size
  let graphPattern = ''
  if (avgDegree > 4) {
    graphPattern = 'Graph is highly interconnected, leading to multiple near-optimal paths.'
  } else if (avgDegree > 2.5) {
    graphPattern = 'Graph has moderate connectivity with several alternative routes.'
  } else {
    graphPattern = 'Graph is sparsely connected, limiting path options.'
  }
  
  return {
    narrative,
    graphPattern,
    breakdown: {
      mostExpensive: {
        edge: expensiveEdge,
        weight: maxWeight,
        from: expensiveEdgeObj?.source,
        to: expensiveEdgeObj?.target
      },
      avgWeight: avgWeight.toFixed(1),
      efficiency: (efficiency * 100).toFixed(1),
      directness: ((directDistance / nodes.length) * 100).toFixed(0)
    }
  }
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
  const [pathStory, setPathStory] = useState(null)
  const [pathData, setPathData] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || appRef.current) return

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
        pathData: null
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
          setPathStory(null); setPathData(null)
        } else {
          if (id === s.source) return
          s.target = id; renderer.selectedTarget = id; setTargetId(id)
          resetAlgo(s, setStats, setRunning, setPlaying)
          setPathStory(null); setPathData(null)
        }
      })

      window.addEventListener('resize', () => { renderer.resize(); renderer.fitToView() })
    })

    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => { if (appRef.current) appRef.current.speed = speed }, [speed])
  useEffect(() => { if (appRef.current) appRef.current.algorithm = algorithm }, [algorithm])

  useEffect(() => {
    if (!appRef.current) return
    const analysis = analyzeGraph(appRef.current.graph)
    setGraphAnalysis(analysis)

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
    if (s.running) { playAlgo(s, setStats, setRunning, setPlaying, setPathStory, setPathData); return }
    if (initAlgo(s, setStats, setRunning)) playAlgo(s, setStats, setRunning, setPlaying, setPathStory, setPathData)
  }

  function handleStep() {
    const s = appRef.current; if (!s) return
    if (!s.running) initAlgo(s, setStats, setRunning)
    stepAlgo(s, setStats, setRunning, setPlaying, setPathStory, setPathData)
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
    finishAlgo(s, setStats, setRunning, setPlaying, setPathStory, setPathData)
  }

  function handleReset() {
    const s = appRef.current; if (!s) return
    resetAlgo(s, setStats, setRunning, setPlaying)
    setPathStory(null)
    setPathData(null)
  }

  function handleSourceChange(e) {
    const s = appRef.current; if (!s || !e.target.value) return
    s.source = e.target.value; s.renderer.selectedSource = e.target.value
    setSourceId(e.target.value)
    resetAlgo(s, setStats, setRunning, setPlaying)
    setPathStory(null); setPathData(null)
  }

  function handleTargetChange(e) {
    const s = appRef.current; if (!s || !e.target.value) return
    if (e.target.value === s.source) return
    s.target = e.target.value; s.renderer.selectedTarget = e.target.value
    setTargetId(e.target.value)
    resetAlgo(s, setStats, setRunning, setPlaying)
    setPathStory(null); setPathData(null)
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
        const analysis = analyzeGraph(s.graph)
        setGraphAnalysis(analysis)
        setPathStory(null); setPathData(null)
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
    const analysis = analyzeGraph(s.graph)
    setGraphAnalysis(analysis)
    setPathStory(null); setPathData(null)
  }

  function handleWeightAdjust(delta) {
    if (!pathData || !appRef.current) return
    const s = appRef.current
    
    let newTotalCost = 0
    pathData.edges.forEach(eid => {
      const edge = s.graph.edges.get(eid)
      if (edge) {
        newTotalCost += Math.max(1, edge.weight + delta)
      }
    })
    
    const change = newTotalCost - (pathData.distance || stats.pathCost)
    const direction = change > 0 ? 'increase' : 'decrease'
    const message = `If all edges ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}, this path would ${direction} by ~${Math.abs(change).toFixed(1)} units. The algorithm might ${Math.abs(change) > 5 ? 'find a different route' : 'stick with this path'}.`
    
    alert(message)
  }

  function handleExpensiveEdgeAdjust() {
    if (!pathStory || !appRef.current) return
    const s = appRef.current
    const expensiveEdge = s.graph.edges.get(pathStory.breakdown.mostExpensive.edge)
    if (!expensiveEdge) return
    
    const oldWeight = expensiveEdge.weight
    const newWeight = Math.ceil(oldWeight / 2)
    const savings = oldWeight - newWeight
    
    const message = `If we halved the expensive edge (${expensiveEdge.source} → ${expensiveEdge.target}) from ${oldWeight} to ${newWeight}, we'd save ${savings} units. ${savings > 3 ? 'This could make alternative paths more attractive!' : 'The current path would likely remain optimal.'}`
    
    alert(message)
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

          <aside className="sidebar sidebar-right">
            {pathStory ? (
              <>
                <section className="panel story-panel">
                  <h3 className="panel-title">📖 Path Story</h3>
                  <div className="story-content">
                    <p className="story-narrative">{pathStory.narrative}</p>
                    <div className="story-insight">
                      <span className="insight-icon">💡</span>
                      <span className="insight-text">{pathStory.graphPattern}</span>
                    </div>
                  </div>
                </section>

                <section className="panel breakdown-panel">
                  <h3 className="panel-title">🔍 Path Breakdown</h3>
                  <div className="breakdown-grid">
                    <div className="breakdown-item">
                      <div className="breakdown-label">Most Expensive Edge</div>
                      <div className="breakdown-value highlight-expensive">
                        {pathStory.breakdown.mostExpensive.from} → {pathStory.breakdown.mostExpensive.to}
                        <span className="breakdown-badge">{pathStory.breakdown.mostExpensive.weight}</span>
                      </div>
                    </div>
                    <div className="breakdown-item">
                      <div className="breakdown-label">Average Edge Weight</div>
                      <div className="breakdown-value">{pathStory.breakdown.avgWeight}</div>
                    </div>
                    <div className="breakdown-item">
                      <div className="breakdown-label">Search Efficiency</div>
                      <div className="breakdown-value">{pathStory.breakdown.efficiency}% of graph</div>
                    </div>
                    <div className="breakdown-item">
                      <div className="breakdown-label">Path Directness</div>
                      <div className="breakdown-value">{pathStory.breakdown.directness}% optimal</div>
                    </div>
                  </div>
                </section>

                <section className="panel whatif-panel">
                  <h3 className="panel-title">🎲 What If?</h3>
                  <div className="whatif-content">
                    <p className="whatif-desc">Adjust edge weights to see how the path might change</p>
                    <div className="whatif-controls">
                      <button className="whatif-btn" onClick={() => handleWeightAdjust(-1)}>
                        <span className="whatif-icon">−</span>
                        <span className="whatif-label">Reduce All Weights</span>
                      </button>
                      <button className="whatif-btn" onClick={() => handleWeightAdjust(1)}>
                        <span className="whatif-icon">+</span>
                        <span className="whatif-label">Increase All Weights</span>
                      </button>
                      <button className="whatif-btn whatif-expensive" onClick={() => handleExpensiveEdgeAdjust()}>
                        <span className="whatif-icon">⚡</span>
                        <span className="whatif-label">Halve Expensive Edge</span>
                      </button>
                    </div>
                    <div className="whatif-hint">
                      Changes are temporary and won't affect the current visualization
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <section className="panel empty-story-panel">
                <div className="empty-story">
                  <div className="empty-icon">🎯</div>
                  <h3 className="empty-title">Ready to Explore</h3>
                  <p className="empty-text">
                    Run an algorithm to see the path story unfold. 
                    I'll analyze the journey and share insights about how the algorithm navigated the graph.
                  </p>
                </div>
              </section>
            )}
          </aside>
        </main>
      </div>

      <input type="file" id="file-input" accept=".json,application/json" hidden onChange={handleImport} />
    </>
  )
}
