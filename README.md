# PathCraft

Interactive graph search and weighted pathfinding visualizer running natively on HTML5 `<canvas>`.

## Features
- **6 Algorithms**: `A* (Manhattan)`, `A* (Euclidean)`, `Dijkstra`, `BFS`, `Greedy Best-First`, and `DFS`.
- **Weighted Terrain & Interactive Pins**: Paint impassable walls (`∞`) or weighted swamp cells (`5x` cost), erase cells, or drag Start `(S)` and Target `(T)` markers directly on the grid.
- **Scenario & Maze Presets**: `Maze Division`, `Scatter 28%`, `Concave Trap` (highlights Greedy heuristic trap vs. A\* optimality), and `Swamp River` (highlights Dijkstra vs. BFS).
- **Step Inspector & Benchmark Log**: Scrub frame-by-frame (`Step +1`) or compare Visited Nodes, Weighted Path Cost, and Compute Time across runs.
