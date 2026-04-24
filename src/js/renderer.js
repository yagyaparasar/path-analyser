// ─── Canvas Renderer ──────────────────────────────────────────────
// Handles all rendering, pan/zoom, hit-testing, and visual state.

export class Renderer {
  constructor(canvas, graph) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.graph = graph;

    // ── View transform ──
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
    this.targetScale = 1;  // For smooth zooming
    this.zoomSpeed = 0.15;  // Smoothing factor

    // ── Visual state maps ──
    this.nodeStates = new Map();
    this.edgeStates = new Map();
    this.pathNodes = new Set();
    this.pathEdges = new Set();

    // ── Selection ──
    this.selectedSource = null;
    this.selectedTarget = null;
    this.hoveredNode = null;

    // ── Drag state ──
    this._dragging = false;
    this._lastMX = 0;
    this._lastMY = 0;

    // ── Dimensions ──
    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;

    // ── Animation time ──
    this._time = 0;

    // ── Palette ──
    this.C = {
      bg: '#060a13',
      grid: 'rgba(255,255,255,0.02)',
      node: {
        default: { fill: '#111828', stroke: '#2d3a5c', text: '#8b949e' },
        enqueued: { fill: '#78350f', stroke: '#f59e0b', text: '#fef3c7' },
        visiting: { fill: '#4c1d95', stroke: '#a855f7', text: '#f3e8ff' },
        visited: { fill: '#1e1b4b', stroke: '#6366f1', text: '#c7d2fe' },
        source: { fill: '#064e3b', stroke: '#10b981', text: '#d1fae5' },
        target: { fill: '#7f1d1d', stroke: '#ef4444', text: '#fee2e2' },
        path: { fill: '#0c4a6e', stroke: '#00d4ff', text: '#e0f2fe' },
      },
      edge: {
        default: { stroke: '#3d4f72', width: 1.8 },
        explored: { stroke: 'rgba(99,102,241,0.75)', width: 2.5 },
        relaxed: { stroke: 'rgba(245,158,11,0.8)', width: 3 },
        path: { stroke: '#00d4ff', width: 5 },
      },
    };

    this._init();
  }

  /* ──────────────────── Setup ──────────────────── */

  _init() {
    this.resize();
    this._setupInteraction();
    this._scheduleRender();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  fitToView() {
    if (this.graph.nodes.size === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of this.graph.nodes.values()) {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    }
    const pad = 100;
    const gw = maxX - minX + pad * 2;
    const gh = maxY - minY + pad * 2;
    this.scale = Math.min(this.width / gw, this.height / gh, 2.5);
    this.targetScale = this.scale;
    this.offsetX = this.width / 2 - ((minX + maxX) / 2) * this.scale;
    this.offsetY = this.height / 2 - ((minY + maxY) / 2) * this.scale;
  }

  /* ──────────────────── Interaction ──────────────────── */

  _setupInteraction() {
    const c = this.canvas;

    c.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this._dragging = true;
        this._lastMX = e.clientX;
        this._lastMY = e.clientY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this._dragging) {
        this.offsetX += e.clientX - this._lastMX;
        this.offsetY += e.clientY - this._lastMY;
        this._lastMX = e.clientX;
        this._lastMY = e.clientY;
      }
      const r = c.getBoundingClientRect();
      this.hoveredNode = this._hitTest(e.clientX - r.left, e.clientY - r.top);
      c.style.cursor = this.hoveredNode ? 'pointer' : (this._dragging ? 'grabbing' : 'grab');
    });

    window.addEventListener('mouseup', () => {
      this._dragging = false;
    });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const z = e.deltaY < 0 ? 1.1 : 0.91;
      this.targetScale = Math.max(0.08, Math.min(6, this.targetScale * z));
    }, { passive: false });
  }

  _hitTest(sx, sy) {
    const wx = (sx - this.offsetX) / this.scale;
    const wy = (sy - this.offsetY) / this.scale;
    const r2 = (22 / this.scale) ** 2;
    for (const [id, n] of this.graph.nodes) {
      if ((wx - n.x) ** 2 + (wy - n.y) ** 2 <= r2) return id;
    }
    return null;
  }

  hitTestNode(sx, sy) { return this._hitTest(sx, sy); }

  /* ──────────────────── State API ──────────────────── */

  setNodeState(id, state) { this.nodeStates.set(id, state); }
  setEdgeState(id, state) { this.edgeStates.set(id, state); }
  highlightPath(nodes, edges) {
    this.pathNodes = new Set(nodes);
    this.pathEdges = new Set(edges);
  }
  resetStates() {
    this.nodeStates.clear();
    this.edgeStates.clear();
    this.pathNodes.clear();
    this.pathEdges.clear();
  }

  /* ──────────────────── Coordinate helpers ──────────────────── */

  _w2s(wx, wy) {
    return { x: wx * this.scale + this.offsetX, y: wy * this.scale + this.offsetY };
  }

  /* ──────────────────── Render Loop ──────────────────── */

  _scheduleRender() {
    const loop = (t) => { this._time = t * 0.001; this._render(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  _render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // ── Smooth zoom interpolation ──
    if (Math.abs(this.targetScale - this.scale) > 0.001) {
      const oldScale = this.scale;
      this.scale += (this.targetScale - this.scale) * this.zoomSpeed;

      // Adjust offset to zoom towards center
      const centerX = w / 2;
      const centerY = h / 2;
      const f = this.scale / oldScale;
      this.offsetX = centerX - (centerX - this.offsetX) * f;
      this.offsetY = centerY - (centerY - this.offsetY) * f;
    }

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // ── Radial gradient background for depth ──
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    bgGrad.addColorStop(0, '#0a0f1a');
    bgGrad.addColorStop(1, '#040710');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // ── Subtle dot grid ──
    this._drawGrid(ctx, w, h);

    // ── World-space transform ──
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // ── Edges ──
    for (const [eid, edge] of this.graph.edges) this._drawEdge(ctx, edge, eid);

    // ── Nodes ──
    for (const [nid, node] of this.graph.nodes) this._drawNode(ctx, node, nid);

    ctx.restore();

    // ── Tooltip (screen-space) ──
    if (this.hoveredNode) this._drawTooltip(ctx);
  }

  /* ──────────────────── Grid ──────────────────── */

  _drawGrid(ctx, w, h) {
    const gs = 36 * this.scale;
    if (gs < 12) return;
    ctx.fillStyle = this.C.grid;
    const sx = ((this.offsetX % gs) + gs) % gs;
    const sy = ((this.offsetY % gs) + gs) % gs;
    for (let x = sx; x < w; x += gs)
      for (let y = sy; y < h; y += gs) {
        ctx.beginPath();
        ctx.arc(x, y, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
  }

  /* ──────────────────── Draw Edge ──────────────────── */

  _drawEdge(ctx, edge, eid) {
    const sn = this.graph.nodes.get(edge.source);
    const tn = this.graph.nodes.get(edge.target);
    if (!sn || !tn) return;

    const isPath = this.pathEdges.has(eid);
    const state = this.edgeStates.get(eid) || 'default';
    const style = isPath ? this.C.edge.path : (this.C.edge[state] || this.C.edge.default);

    if (isPath) {
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 20;
    }

    ctx.beginPath();
    ctx.moveTo(sn.x, sn.y);
    ctx.lineTo(tn.x, tn.y);
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.width;
    ctx.stroke();

    // Double-glow for path edges
    if (isPath) {
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = style.width + 6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

    // ── Arrowhead for directed graphs ──
    if (this.graph.directed) {
      const a = Math.atan2(tn.y - sn.y, tn.x - sn.x);
      const r = 17, hl = 10;
      const tx = tn.x - Math.cos(a) * r;
      const ty = tn.y - Math.sin(a) * r;
      ctx.fillStyle = style.stroke;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - hl * Math.cos(a - 0.42), ty - hl * Math.sin(a - 0.42));
      ctx.lineTo(tx - hl * Math.cos(a + 0.42), ty - hl * Math.sin(a + 0.42));
      ctx.closePath();
      ctx.fill();
    }

    // ── Weight label — dynamic: only show when zoomed in enough ──
    if (this.scale > 0.55) {
      const mx = (sn.x + tn.x) / 2;
      const my = (sn.y + tn.y) / 2;
      const dx = tn.x - sn.x, dy = tn.y - sn.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ox = (-dy / len) * 11;
      const oy = (dx / len) * 11;

      const fs = Math.min(10, 7 + this.scale * 3);
      ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
      const txt = String(edge.weight);
      const tm = ctx.measureText(txt);
      const pw = 4;

      // pill background
      ctx.fillStyle = 'rgba(6,10,19,0.88)';
      ctx.beginPath();
      ctx.roundRect(mx + ox - tm.width / 2 - pw, my + oy - fs / 2 - pw, tm.width + pw * 2, fs + pw * 2, 4);
      ctx.fill();

      ctx.fillStyle = isPath ? '#00d4ff' : (state !== 'default' ? '#b0bec5' : '#4a6090');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, mx + ox, my + oy);
    }
  }

  /* ──────────────────── Draw Node ──────────────────── */

  _drawNode(ctx, node, nid) {
    const state = this.nodeStates.get(nid) || 'default';
    const isSrc = nid === this.selectedSource;
    const isTgt = nid === this.selectedTarget;
    const isPath = this.pathNodes.has(nid);
    const isHover = nid === this.hoveredNode;

    let col;
    if (isSrc) col = this.C.node.source;
    else if (isTgt) col = this.C.node.target;
    else if (isPath) col = this.C.node.path;
    else col = this.C.node[state] || this.C.node.default;

    // ── Dynamic node size based on zoom ──
    // Nodes shrink when zoomed out, grow when zoomed in
    const dynamicBase = Math.max(4, Math.min(14, 5 + this.scale * 9));
    const importantNode = isSrc || isTgt || isPath;
    const baseR = isHover ? dynamicBase + 3 : (importantNode ? dynamicBase + 1 : dynamicBase);

    // Pulse animation for source/target nodes
    let R = baseR;
    if (isSrc || isTgt) {
      const pulse = Math.sin(this._time * 3) * 1.5;
      R = baseR + pulse;
    }

    // Glow effect — scale glow with zoom
    if (isSrc || isTgt || isPath || state === 'visiting') {
      ctx.shadowColor = col.stroke;
      ctx.shadowBlur = Math.min(28, 10 + this.scale * 12);
    }

    // hover ring
    if (isHover) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, R + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, R, 0, Math.PI * 2);
    ctx.fillStyle = col.fill;
    ctx.fill();
    ctx.strokeStyle = col.stroke;
    ctx.lineWidth = importantNode ? 2.2 : 1.2;
    ctx.stroke();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

    // ── Dynamic label rendering ──
    // Only show labels when zoomed in enough for them to be readable
    if (this.scale > 0.45) {
      const fs = Math.max(6, Math.min(10, 4 + this.scale * 6));
      ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = col.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let lbl = node.label;
      // Truncate more aggressively at lower zoom
      const maxLen = this.scale > 1.2 ? 12 : (this.scale > 0.7 ? 8 : 5);
      if (lbl.length > maxLen) lbl = lbl.slice(0, maxLen - 1) + '…';
      ctx.fillText(lbl, node.x, node.y + 0.5);
    }
  }

  /* ──────────────────── Tooltip ──────────────────── */

  _drawTooltip(ctx) {
    const node = this.graph.nodes.get(this.hoveredNode);
    if (!node) return;
    const sp = this._w2s(node.x, node.y);
    const txt = `${node.label}  (${this.hoveredNode})`;

    ctx.font = '500 12px Inter, system-ui, sans-serif';
    const tm = ctx.measureText(txt);
    const pw = 10, ph = 7;
    const tx = sp.x;
    const ty = sp.y - 20 * this.scale - 18;

    // Tooltip background
    ctx.fillStyle = 'rgba(10,15,30,0.94)';
    ctx.strokeStyle = 'rgba(0,212,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tx - tm.width / 2 - pw, ty - 8 - ph, tm.width + pw * 2, 16 + ph * 2, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, tx, ty);
  }
}
