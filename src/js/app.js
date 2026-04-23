// ─── Application Controller ───────────────────────────────────────
import { Graph, generatePresetGraph } from './graph.js';
import { Renderer } from './renderer.js';
import { bfs, dfs, dijkstra, aStar, bellmanFord, ALGORITHMS } from './algorithms.js';

const ALGO_MAP = { bfs, dfs, dijkstra, aStar, bellmanFord };

class App {
  constructor() {
    this.graph    = new Graph();
    this.canvas   = document.getElementById('graph-canvas');
    this.renderer = null;

    // algorithm state
    this._gen       = null;     // current generator
    this._timer     = null;
    this._playing   = false;
    this._running   = false;

    // settings
    this.speed     = 150;       // ms per step
    this.algorithm = 'dijkstra';
    this.source    = null;
    this.target    = null;

    // stats
    this.stats = this._emptyStats();

    this._boot();
  }

  _emptyStats() {
    return { visited: 0, explored: 0, pathCost: null, pathHops: null, steps: 0 };
  }

  /* ─────────── Bootstrap ─────────── */

  _boot() {
    generatePresetGraph(this.graph);
    this.renderer = new Renderer(this.canvas, this.graph);
    this._populateSelectors();
    this._wireEvents();
    this.renderer.fitToView();
    this._updateGraphBadges();

    // sensible defaults
    const ids = Array.from(this.graph.nodes.keys());
    if (ids.length >= 2) {
      this._setSource(ids[0]);
      this._setTarget(ids[ids.length - 1]);
    }

    this._updateAlgoInfo();
    this._toast('Graph loaded — select source & target, then run an algorithm.', 'info');
  }

  /* ─────────── Populate node dropdowns ─────────── */

  _populateSelectors() {
    const ss = document.getElementById('source-select');
    const ts = document.getElementById('target-select');
    const placeholder = '<option value="">Click a node or select…</option>';
    ss.innerHTML = placeholder;
    ts.innerHTML = placeholder;
    for (const [id, n] of this.graph.nodes) {
      const o = `<option value="${id}">${n.label} (${id})</option>`;
      ss.insertAdjacentHTML('beforeend', o);
      ts.insertAdjacentHTML('beforeend', o);
    }
  }

  /* ─────────── Event wiring ─────────── */

  _wireEvents() {
    // ── Algorithm buttons ──
    document.querySelectorAll('.algo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.algorithm = btn.dataset.algo;
        this._updateAlgoInfo();
      });
    });

    // ── Dropdowns ──
    document.getElementById('source-select').addEventListener('change', e => {
      if (e.target.value) this._setSource(e.target.value);
    });
    document.getElementById('target-select').addEventListener('change', e => {
      if (e.target.value) this._setTarget(e.target.value);
    });

    // ── Canvas click → select nodes ──
    this.canvas.addEventListener('click', e => {
      const r  = this.canvas.getBoundingClientRect();
      const id = this.renderer.hitTestNode(e.clientX - r.left, e.clientY - r.top);
      if (!id) return;
      if (!this.source || (this.source && this.target)) {
        this._setSource(id);
        this._clearTarget();
      } else {
        if (id === this.source) { this._toast('Target must differ from source.', 'warning'); return; }
        this._setTarget(id);
      }
    });

    // ── Control buttons ──
    document.getElementById('btn-run').addEventListener('click',   () => this._run());
    document.getElementById('btn-step').addEventListener('click',  () => { if (!this._running) this._initAlgo(); this._step(); });
    document.getElementById('btn-pause').addEventListener('click', () => this._pause());
    document.getElementById('btn-skip').addEventListener('click',  () => this._skipToEnd());
    document.getElementById('btn-reset').addEventListener('click', () => this._reset());

    // ── Speed ──
    const slider = document.getElementById('speed-slider');
    const label  = document.getElementById('speed-value');
    slider.addEventListener('input', e => {
      this.speed = +e.target.value;
      label.textContent = `${this.speed}ms`;
      if (this._playing) { this._pause(); this._play(); }
    });

    // ── Import / Export / Preset ──
    document.getElementById('btn-import').addEventListener('click', () => document.getElementById('file-input').click());
    document.getElementById('file-input').addEventListener('change', e => this._importGraph(e.target.files[0]));
    document.getElementById('btn-export').addEventListener('click', () => this._exportGraph());
    document.getElementById('btn-preset').addEventListener('click', () => this._loadPreset());

    // ── Resize ──
    window.addEventListener('resize', () => { this.renderer.resize(); this.renderer.fitToView(); });
  }

  /* ─────────── Source / Target helpers ─────────── */

  _setSource(id) {
    this.source = id;
    this.renderer.selectedSource = id;
    document.getElementById('source-select').value = id;
    this._reset();
  }

  _setTarget(id) {
    if (id === this.source) { this._toast('Target must differ from source.', 'warning'); return; }
    this.target = id;
    this.renderer.selectedTarget = id;
    document.getElementById('target-select').value = id;
    this._reset();
  }

  _clearTarget() {
    this.target = null;
    this.renderer.selectedTarget = null;
    document.getElementById('target-select').value = '';
    this._reset();
  }

  /* ─────────── Algorithm lifecycle ─────────── */

  _initAlgo() {
    if (!this.source || !this.target) {
      this._toast('Select both source and target nodes first.', 'warning');
      return false;
    }
    this.renderer.resetStates();
    this.stats = this._emptyStats();
    this._syncStats();

    const fn = ALGO_MAP[this.algorithm];
    if (!fn) { this._toast('Unknown algorithm.', 'error'); return false; }

    this._gen     = fn(this.graph, this.source, this.target);
    this._running = true;
    document.getElementById('btn-run').disabled = true;
    return true;
  }

  _run() {
    if (this._running) { this._play(); return; }
    if (this._initAlgo()) this._play();
  }

  _play() {
    if (!this._running) return;
    this._playing = true;
    document.getElementById('btn-pause').disabled = false;
    this._timer = setInterval(() => { if (!this._step()) this._pause(); }, this.speed);
  }

  _pause() {
    this._playing = false;
    clearInterval(this._timer);
    this._timer = null;
    document.getElementById('btn-pause').disabled = true;
  }

  _step() {
    if (!this._gen) return false;
    const r = this._gen.next();
    if (r.done) { this._finish(); return false; }
    this.stats.steps++;
    this._processEvent(r.value);
    return true;
  }

  _skipToEnd() {
    if (!this._running && !this._initAlgo()) return;
    this._pause();
    while (this._gen) {
      const r = this._gen.next();
      if (r.done) break;
      this.stats.steps++;
      this._processEvent(r.value);
    }
    this._finish();
  }

  _reset() {
    this._pause();
    this._gen     = null;
    this._running = false;
    this._playing = false;
    this.stats    = this._emptyStats();
    this.renderer.resetStates();
    this._syncStats();
    document.getElementById('btn-run').disabled   = false;
    document.getElementById('btn-pause').disabled = true;
  }

  _finish() {
    this._running = false;
    this._playing = false;
    clearInterval(this._timer);
    document.getElementById('btn-run').disabled   = false;
    document.getElementById('btn-pause').disabled = true;
  }

  /* ─────────── Event processing ─────────── */

  _processEvent(ev) {
    switch (ev.type) {
      case 'enqueue':
        if (this.graph.nodes.has(ev.nodeId))
          this.renderer.setNodeState(ev.nodeId, 'enqueued');
        break;
      case 'dequeue':
        if (this.graph.nodes.has(ev.nodeId))
          this.renderer.setNodeState(ev.nodeId, 'visiting');
        break;
      case 'visit':
        if (this.graph.nodes.has(ev.nodeId)) {
          this.renderer.setNodeState(ev.nodeId, 'visited');
          this.stats.visited++;
        }
        break;
      case 'explore':
        this.renderer.setEdgeState(ev.edgeId, 'explored');
        this.stats.explored++;
        break;
      case 'relax':
        this.renderer.setEdgeState(ev.edgeId, 'relaxed');
        if (this.graph.nodes.has(ev.nodeId))
          this.renderer.setNodeState(ev.nodeId, 'enqueued');
        break;
      case 'path':
        this.renderer.highlightPath(ev.nodes, ev.edges);
        this.stats.pathCost = ev.distance ?? ev.nodes.length - 1;
        this.stats.pathHops = ev.nodes.length;
        this._toast(`Path found! Cost: ${this.stats.pathCost}  ·  ${this.stats.pathHops} nodes`, 'success');
        break;
      case 'done':
        if (!ev.found) this._toast('No path exists between the selected nodes.', 'error');
        break;
    }
    this._syncStats();
  }

  /* ─────────── UI helpers ─────────── */

  _syncStats() {
    document.getElementById('stat-visited').textContent     = this.stats.visited;
    document.getElementById('stat-explored').textContent    = this.stats.explored;
    document.getElementById('stat-path-length').textContent = this.stats.pathCost ?? '—';
    document.getElementById('stat-path-nodes').textContent  = this.stats.pathHops ?? '—';
    document.getElementById('stat-steps').textContent       = this.stats.steps;
  }

  _updateAlgoInfo() {
    const info = ALGORITHMS[this.algorithm];
    if (info) {
      document.getElementById('algo-description').textContent = info.description;
      document.getElementById('algo-complexity').textContent  = info.complexity;
    }
  }

  _updateGraphBadges() {
    document.getElementById('node-count').textContent = `${this.graph.nodes.size} nodes`;
    document.getElementById('edge-count').textContent = `${this.graph.edges.size} edges`;
  }

  /* ─────────── Import / Export ─────────── */

  _importGraph(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.nodes || !data.edges) throw new Error('Missing nodes/edges');
        this._reset();
        this.graph.fromJSON(data);
        this.renderer.resetStates();
        this.renderer.fitToView();
        this._populateSelectors();
        this.source = null; this.target = null;
        this.renderer.selectedSource = null;
        this.renderer.selectedTarget = null;
        this._updateGraphBadges();
        this._toast(`Imported ${this.graph.nodes.size} nodes, ${this.graph.edges.size} edges`, 'success');
      } catch (err) {
        this._toast('Invalid JSON — expected { nodes:[], edges:[] }', 'error');
        console.error(err);
      }
    };
    reader.readAsText(file);
    // reset input so same file can be re-imported
    document.getElementById('file-input').value = '';
  }

  _exportGraph() {
    const json = JSON.stringify(this.graph.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'graph.json'; a.click();
    URL.revokeObjectURL(url);
    this._toast('Graph exported as graph.json', 'success');
  }

  _loadPreset() {
    this._reset();
    this.graph.clear();
    generatePresetGraph(this.graph);
    this.renderer.resetStates();
    this.renderer.fitToView();
    this._populateSelectors();
    this._updateGraphBadges();
    const ids = Array.from(this.graph.nodes.keys());
    this._setSource(ids[0]);
    this._setTarget(ids[ids.length - 1]);
    this._toast('Preset graph reloaded.', 'success');
  }

  /* ─────────── Notifications ─────────── */

  _toast(msg, type = 'info') {
    const box = document.getElementById('notifications');
    const el  = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = msg;
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 320);
    }, 3200);
  }
}

/* ─── Launch ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => { window.app = new App(); });
