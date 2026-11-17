(function (global) {
  "use strict";

  const DESCRIPTIONS = {
    astar: "Weighted & optimal. Evaluates f(n) = g(n) + Manhattan h(n) to steer aggressively toward the target while respecting swamp costs.",
    astarEuclid: "Weighted & optimal. Uses Euclidean straight-line distance for smoother open-field diagonal pressure.",
    dijkstra: "Weighted & guaranteed shortest path. Expands uniformly outward by cumulative terrain cost with zero heuristic bias.",
    bfs: "Unweighted & shortest hop count. Ignores swamp costs (treats cost 5 same as 1), demonstrating why Dijkstra/A* win on weighted terrain.",
    greedy: "Fast heuristic-only search (uses h(n) alone). Easily outruns Dijkstra in open space, but gets tricked by concave walls into longer paths.",
    dfs: "Depth-first exploration. Plunges down a single branch before backtracking; does not guarantee shortest paths."
  };

  function key(r, c) {
    return `${r},${c}`;
  }

  function neighbors(r, c, rows, cols, grid) {
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ];
    const out = [];
    for (let i = 0; i < dirs.length; i++) {
      const nr = r + dirs[i][0];
      const nc = c + dirs[i][1];
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== 1) {
        out.push([nr, nc]);
      }
    }
    return out;
  }

  function cellCost(grid, r, c) {
    return grid[r][c] === 2 ? 5 : 1;
  }

  function heuristic(type, r1, c1, r2, c2) {
    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);
    if (type === "astarEuclid") return Math.hypot(dr, dc);
    return dr + dc;
  }

  function solve(algo, grid, start, target) {
    const t0 = performance.now();
    const rows = grid.length;
    const cols = grid[0].length;
    const visitedOrder = [];
    const visitedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();

    const startK = key(start.r, start.c);
    const targetK = key(target.r, target.c);
    gScore.set(startK, 0);

    let found = false;

    if (algo === "bfs" || algo === "dfs") {
      const frontier = [[start.r, start.c]];
      const seen = new Set([startK]);

      while (frontier.length > 0) {
        const [r, c] = algo === "bfs" ? frontier.shift() : frontier.pop();
        const ck = key(r, c);
        if (algo === "dfs") {
          if (visitedSet.has(ck)) continue;
        }
        visitedSet.add(ck);
        visitedOrder.push([r, c]);

        if (ck === targetK) {
          found = true;
          break;
        }

        const nbs = neighbors(r, c, rows, cols, grid);
        for (let i = 0; i < nbs.length; i++) {
          const [nr, nc] = nbs[i];
          const nk = key(nr, nc);
          if (algo === "bfs") {
            if (!seen.has(nk)) {
              seen.add(nk);
              cameFrom.set(nk, ck);
              frontier.push([nr, nc]);
            }
          } else {
            if (!visitedSet.has(nk)) {
              cameFrom.set(nk, ck);
              frontier.push([nr, nc]);
            }
          }
        }
      }
    } else {
      // Priority queue via sorted array (fast for grid <= 1000 cells)
      const pq = [{
        r: start.r,
        c: start.c,
        g: 0,
        f: algo === "dijkstra" ? 0 : heuristic(algo, start.r, start.c, target.r, target.c)
      }];

      while (pq.length > 0) {
        pq.sort((a, b) => a.f - b.f || a.g - b.g);
        const cur = pq.shift();
        const ck = key(cur.r, cur.c);
        if (visitedSet.has(ck)) continue;

        visitedSet.add(ck);
        visitedOrder.push([cur.r, cur.c]);

        if (ck === targetK) {
          found = true;
          break;
        }

        const nbs = neighbors(cur.r, cur.c, rows, cols, grid);
        for (let i = 0; i < nbs.length; i++) {
          const [nr, nc] = nbs[i];
          const nk = key(nr, nc);
          if (visitedSet.has(nk)) continue;

          const stepW = cellCost(grid, nr, nc);
          const tentativeG = (gScore.get(ck) || 0) + stepW;

          if (!gScore.has(nk) || tentativeG < gScore.get(nk)) {
            gScore.set(nk, tentativeG);
            cameFrom.set(nk, ck);
            let f = tentativeG;
            if (algo === "astar" || algo === "astarEuclid") {
              f = tentativeG + heuristic(algo, nr, nc, target.r, target.c) * 1.001;
            } else if (algo === "greedy") {
              f = heuristic("astar", nr, nc, target.r, target.c);
            }
            pq.push({ r: nr, c: nc, g: tentativeG, f });
          }
        }
      }
    }

    const path = [];
    let totalCost = 0;
    if (found) {
      let curr = targetK;
      while (curr) {
        const parts = curr.split(",");
        const r = Number(parts[0]);
        const c = Number(parts[1]);
        path.push([r, c]);
        if (curr !== startK) totalCost += cellCost(grid, r, c);
        curr = cameFrom.get(curr);
      }
      path.reverse();
    }

    return {
      found,
      visitedOrder,
      path,
      visitedCount: visitedOrder.length,
      pathLength: Math.max(0, path.length - 1),
      totalCost,
      elapsedMs: Number((performance.now() - t0).toFixed(2))
    };
  }

  function generateMaze(type, rows, cols, start, target) {
    const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
    const isProtected = (r, c) =>
      (Math.abs(r - start.r) <= 1 && Math.abs(c - start.c) <= 1) ||
      (Math.abs(r - target.r) <= 1 && Math.abs(c - target.c) <= 1);

    if (type === "random") {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (isProtected(r, c)) continue;
          const rnd = Math.random();
          if (rnd < 0.25) grid[r][c] = 1;
          else if (rnd < 0.34) grid[r][c] = 2;
        }
      }
    } else if (type === "trap") {
      const midR = Math.floor(rows / 2);
      const wallC = Math.floor(cols * 0.56);
      for (let r = 2; r < rows - 2; r++) {
        if (!isProtected(r, wallC)) grid[r][wallC] = 1;
      }
      for (let c = Math.floor(cols * 0.28); c <= wallC; c++) {
        if (!isProtected(2, c)) grid[2][c] = 1;
        if (!isProtected(rows - 3, c)) grid[rows - 3][c] = 1;
      }
      grid[midR][Math.floor(cols * 0.28)] = 0;
    } else if (type === "river") {
      const riverStart = Math.floor(cols * 0.35);
      const riverEnd = Math.floor(cols * 0.65);
      for (let r = 0; r < rows; r++) {
        for (let c = riverStart; c <= riverEnd; c++) {
          if (isProtected(r, c)) continue;
          if (r === 1 || r === rows - 2) continue; // bridge bypass
          grid[r][c] = 2;
        }
      }
      // Small rocks in bridge
      for (let r = 3; r < rows - 3; r += 3) {
        if (!isProtected(r, Math.floor(cols * 0.5))) grid[r][Math.floor(cols * 0.5)] = 1;
      }
    } else if (type === "division") {
      // Recursive division style with guaranteed passages
      for (let c = 0; c < cols; c++) {
        if (!isProtected(0, c)) grid[0][c] = 1;
        if (!isProtected(rows - 1, c)) grid[rows - 1][c] = 1;
      }
      for (let r = 0; r < rows; r++) {
        if (!isProtected(r, 0)) grid[r][0] = 1;
        if (!isProtected(r, cols - 1)) grid[r][cols - 1] = 1;
      }

      const divide = (r1, r2, c1, c2) => {
        const h = r2 - r1;
        const w = c2 - c1;
        if (h < 3 || w < 3) return;
        const horizontal = h > w;

        if (horizontal) {
          const wallR = r1 + 1 + Math.floor(Math.random() * (h - 2));
          const gapC = c1 + Math.floor(Math.random() * w);
          for (let c = c1; c < c2; c++) {
            if (c !== gapC && !isProtected(wallR, c)) grid[wallR][c] = 1;
          }
          divide(r1, wallR, c1, c2);
          divide(wallR + 1, r2, c1, c2);
        } else {
          const wallC = c1 + 1 + Math.floor(Math.random() * (w - 2));
          const gapR = r1 + Math.floor(Math.random() * h);
          for (let r = r1; r < r2; r++) {
            if (r !== gapR && !isProtected(r, wallC)) grid[r][wallC] = 1;
          }
          divide(r1, r2, c1, wallC);
          divide(r1, r2, wallC + 1, c2);
        }
      };

      divide(1, rows - 1, 1, cols - 1);
    }

    grid[start.r][start.c] = 0;
    grid[target.r][target.c] = 0;
    return grid;
  }

  global.PathAlgorithms = {
    DESCRIPTIONS,
    solve,
    generateMaze
  };
})(window);
