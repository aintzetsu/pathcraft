(function () {
  "use strict";

  const ROWS = 20;
  const COLS = 36;
  const CELL = 25;

  const canvas = document.getElementById("gridCanvas");
  const ctx = canvas.getContext("2d");

  const algoSelect = document.getElementById("algoSelect");
  const algoDesc = document.getElementById("algoDesc");
  const speedSelect = document.getElementById("speedSelect");

  const runBtn = document.getElementById("runBtn");
  const stepBtn = document.getElementById("stepBtn");
  const clearPathBtn = document.getElementById("clearPathBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const clearLogBtn = document.getElementById("clearLogBtn");

  const statStatus = document.getElementById("statStatus");
  const statVisited = document.getElementById("statVisited");
  const statSteps = document.getElementById("statSteps");
  const statCost = document.getElementById("statCost");
  const statTime = document.getElementById("statTime");
  const logBody = document.getElementById("logBody");

  const state = {
    grid: Array.from({ length: ROWS }, () => new Array(COLS).fill(0)),
    start: { r: 10, c: 5 },
    target: { r: 10, c: 30 },
    brush: "wall",
    draggingPin: null,
    isDrawing: false,
    visitedSet: new Set(),
    pathSet: new Set(),
    result: null,
    animIndex: 0,
    pathIndex: 0,
    isRunning: false,
    rafId: null,
    logs: []
  };

  function cellKey(r, c) {
    return `${r},${c}`;
  }

  function updateAlgoInfo() {
    algoDesc.textContent = window.PathAlgorithms.DESCRIPTIONS[algoSelect.value] || "";
  }

  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL;
        const y = r * CELL;
        const k = cellKey(r, c);
        const type = state.grid[r][c];

        if (type === 1) {
          ctx.fillStyle = "#334155";
        } else if (state.pathSet.has(k)) {
          ctx.fillStyle = "#a3e635";
        } else if (state.visitedSet.has(k)) {
          ctx.fillStyle = type === 2 ? "#0369a1" : "#0e7490";
        } else if (type === 2) {
          ctx.fillStyle = "#92400e";
        } else {
          ctx.fillStyle = "#0b1222";
        }

        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);

        if (type === 2 && !state.pathSet.has(k)) {
          ctx.fillStyle = "#fde68a";
          ctx.font = "700 10px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("5", x + CELL / 2, y + CELL / 2);
        }
      }
    }

    // Draw connected shortest path line
    if (state.result && state.pathSet.size > 1) {
      ctx.strokeStyle = "#ecfccb";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const limit = Math.min(state.pathIndex, state.result.path.length);
      for (let i = 0; i < limit; i++) {
        const [pr, pc] = state.result.path[i];
        const px = pc * CELL + CELL / 2;
        const py = pr * CELL + CELL / 2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Start Pin
    drawPin(state.start.r, state.start.c, "#fbbf24", "#1f2937", "S");
    // Target Pin
    drawPin(state.target.r, state.target.c, "#f43f5e", "#ffffff", "T");
  }

  function drawPin(r, c, fill, textColor, label) {
    const cx = c * CELL + CELL / 2;
    const cy = r * CELL + CELL / 2;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = "800 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, cy + 0.5);
  }

  function clearOverlay(resetStats) {
    cancelAnimationFrame(state.rafId);
    state.isRunning = false;
    runBtn.textContent = "Run Search";
    state.visitedSet.clear();
    state.pathSet.clear();
    state.result = null;
    state.animIndex = 0;
    state.pathIndex = 0;

    if (resetStats) {
      statStatus.textContent = "Ready";
      statVisited.textContent = "0";
      statSteps.textContent = "0";
      statCost.textContent = "0";
      statTime.textContent = "0.0 ms";
    }
    drawGrid();
  }

  function recordLog(algoLabel, res) {
    state.logs.unshift({
      algo: algoLabel,
      outcome: res.found ? "Path Found" : "Blocked",
      visited: res.visitedCount,
      steps: res.pathLength,
      cost: res.found ? res.totalCost : "--",
      time: `${res.elapsedMs} ms`
    });
    if (state.logs.length > 8) state.logs.pop();

    logBody.innerHTML = "";
    state.logs.forEach((row) => {
      const tr = document.createElement("tr");
      [row.algo, row.outcome, row.visited, row.steps, row.cost, row.time].forEach((val, idx) => {
        const td = document.createElement("td");
        td.textContent = String(val);
        if (idx === 1) {
          td.style.color = row.outcome === "Path Found" ? "#a3e635" : "#f43f5e";
        }
        tr.appendChild(td);
      });
      logBody.appendChild(tr);
    });
  }

  function finishAnimation() {
    state.isRunning = false;
    runBtn.textContent = "Run Search";
    const res = state.result;
    statStatus.textContent = res.found ? "Path Found" : "No Path";
    statVisited.textContent = String(res.visitedCount);
    statSteps.textContent = String(res.pathLength);
    statCost.textContent = res.found ? String(res.totalCost) : "--";
    statTime.textContent = `${res.elapsedMs} ms`;

    const selectedText = algoSelect.options[algoSelect.selectedIndex].text.split(" (")[0];
    recordLog(selectedText, res);
    drawGrid();
  }

  function ensureComputed() {
    if (!state.result) {
      state.visitedSet.clear();
      state.pathSet.clear();
      state.animIndex = 0;
      state.pathIndex = 0;
      state.result = window.PathAlgorithms.solve(
        algoSelect.value,
        state.grid,
        state.start,
        state.target
      );
      statTime.textContent = `${state.result.elapsedMs} ms`;
    }
  }

  function advanceFrame() {
    const res = state.result;
    const speed = speedSelect.value;
    const batch = speed === "slow" ? 1 : speed === "normal" ? 5 : speed === "fast" ? 18 : 9999;

    for (let i = 0; i < batch; i++) {
      if (state.animIndex < res.visitedOrder.length) {
        const [r, c] = res.visitedOrder[state.animIndex++];
        state.visitedSet.add(cellKey(r, c));
      } else if (state.pathIndex < res.path.length) {
        const [pr, pc] = res.path[state.pathIndex++];
        state.pathSet.add(cellKey(pr, pc));
      } else {
        finishAnimation();
        return;
      }
    }

    statStatus.textContent = state.animIndex < res.visitedOrder.length ? "Searching..." : "Tracing...";
    statVisited.textContent = String(state.visitedSet.size);
    drawGrid();

    if (state.isRunning) {
      state.rafId = requestAnimationFrame(advanceFrame);
    }
  }

  function startOrPause() {
    if (state.isRunning) {
      state.isRunning = false;
      cancelAnimationFrame(state.rafId);
      runBtn.textContent = "Resume";
      statStatus.textContent = "Paused";
      return;
    }

    // If finished previous run, restart cleanly
    if (state.result && state.animIndex >= state.result.visitedOrder.length && state.pathIndex >= state.result.path.length) {
      clearOverlay(false);
    }

    ensureComputed();

    if (speedSelect.value === "instant") {
      state.result.visitedOrder.forEach(([r, c]) => state.visitedSet.add(cellKey(r, c)));
      state.result.path.forEach(([r, c]) => state.pathSet.add(cellKey(r, c)));
      state.animIndex = state.result.visitedOrder.length;
      state.pathIndex = state.result.path.length;
      finishAnimation();
      return;
    }

    state.isRunning = true;
    runBtn.textContent = "Pause";
    state.rafId = requestAnimationFrame(advanceFrame);
  }

  function stepOnce() {
    if (state.isRunning) {
      state.isRunning = false;
      cancelAnimationFrame(state.rafId);
      runBtn.textContent = "Resume";
    }
    ensureComputed();
    const res = state.result;
    if (state.animIndex < res.visitedOrder.length) {
      const [r, c] = res.visitedOrder[state.animIndex++];
      state.visitedSet.add(cellKey(r, c));
      statStatus.textContent = "Stepping";
      statVisited.textContent = String(state.visitedSet.size);
      drawGrid();
    } else if (state.pathIndex < res.path.length) {
      const [pr, pc] = res.path[state.pathIndex++];
      state.pathSet.add(cellKey(pr, pc));
      drawGrid();
    } else {
      finishAnimation();
    }
  }

  function getCellFromPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const c = Math.max(0, Math.min(COLS - 1, Math.floor(((e.clientX - rect.left) * scaleX) / CELL)));
    const r = Math.max(0, Math.min(ROWS - 1, Math.floor(((e.clientY - rect.top) * scaleY) / CELL)));
    return { r, c };
  }

  function applyBrushAt(r, c) {
    if ((r === state.start.r && c === state.start.c) || (r === state.target.r && c === state.target.c)) {
      return;
    }
    if (state.brush === "wall") state.grid[r][c] = 1;
    else if (state.brush === "weight") state.grid[r][c] = 2;
    else if (state.brush === "erase") state.grid[r][c] = 0;
    else if (state.brush === "start") {
      state.grid[r][c] = 0;
      state.start = { r, c };
    }
    clearOverlay(true);
  }

  canvas.addEventListener("pointerdown", (e) => {
    const { r, c } = getCellFromPointer(e);
    if (r === state.start.r && c === state.start.c) {
      state.draggingPin = "start";
      return;
    }
    if (r === state.target.r && c === state.target.c) {
      state.draggingPin = "target";
      return;
    }
    state.isDrawing = true;
    applyBrushAt(r, c);
  });

  canvas.addEventListener("pointermove", (e) => {
    const { r, c } = getCellFromPointer(e);
    if (state.draggingPin) {
      if (state.draggingPin === "start" && !(r === state.target.r && c === state.target.c)) {
        state.grid[r][c] = 0;
        state.start = { r, c };
      } else if (state.draggingPin === "target" && !(r === state.start.r && c === state.start.c)) {
        state.grid[r][c] = 0;
        state.target = { r, c };
      }
      clearOverlay(true);
      return;
    }
    if (state.isDrawing && state.brush !== "start") {
      applyBrushAt(r, c);
    }
  });

  window.addEventListener("pointerup", () => {
    state.isDrawing = false;
    state.draggingPin = null;
  });

  document.querySelectorAll(".brush-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".brush-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.brush = btn.dataset.brush;
    });
  });

  document.querySelectorAll("[data-maze]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.grid = window.PathAlgorithms.generateMaze(
        btn.dataset.maze,
        ROWS,
        COLS,
        state.start,
        state.target
      );
      clearOverlay(true);
    });
  });

  algoSelect.addEventListener("change", () => {
    updateAlgoInfo();
    clearOverlay(true);
  });

  runBtn.addEventListener("click", startOrPause);
  stepBtn.addEventListener("click", stepOnce);
  clearPathBtn.addEventListener("click", () => clearOverlay(true));
  clearAllBtn.addEventListener("click", () => {
    state.grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    clearOverlay(true);
  });

  clearLogBtn.addEventListener("click", () => {
    state.logs = [];
    logBody.innerHTML = '<tr><td colspan="6" style="color:var(--text-secondary);">Run a search to compare heuristics on the same obstacle layout.</td></tr>';
  });

  // Seed initial interesting concave trap so page invites immediate experimentation
  state.grid = window.PathAlgorithms.generateMaze("trap", ROWS, COLS, state.start, state.target);
  updateAlgoInfo();
  drawGrid();
})();
