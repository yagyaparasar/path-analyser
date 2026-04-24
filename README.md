# PathFinder
### Shortest Path Algorithm Visualizer and Analysis Engine

PathFinder is an interactive graph-based system designed to visualize, analyze, and compare shortest path algorithms in real time. It enables users to explore how different algorithms traverse graphs, evaluate their efficiency, and understand their behavior under varying conditions.

Live Demo: https://path-analyser.vercel.app  

---

## Overview

PathFinder goes beyond simple visualization by combining execution, analysis, and decision support into a single system. It allows users to construct graphs, run multiple algorithms, and gain insights into traversal patterns, efficiency, and real-world applicability.

---

## Core Concepts Demonstrated

- Graph traversal and shortest path algorithms  
- Algorithmic trade-offs and efficiency analysis  
- Priority queue-based optimization  
- Weighted vs unweighted graph behavior  
- Real-time simulation of algorithm execution  
- Comparative analysis across multiple algorithms  

---

## Tech Stack

- React.js  
- JavaScript  
- Vite  
- HTML/CSS  

---

## Supported Algorithms

- Dijkstra’s Algorithm  
- A* Search  
- Breadth-First Search (BFS)  
- Depth-First Search (DFS)  
- Bellman-Ford Algorithm  

---

## Features

### Interactive Graph Visualization
- Dynamic node and edge network rendering  
- Visual representation of traversal paths  
- Real-time highlighting of visited nodes and final shortest path  

---

### Multi-Algorithm Execution
- Run different algorithms on the same graph  
- Compare behavior and results visually  
- Understand differences in traversal strategies  

---

### Execution Controls
- Run, step, pause, and reset functionality  
- Adjustable execution speed  
- Fine-grained control over simulation flow  

---

### Algorithm Intelligence Panel
Provides contextual insights for each algorithm:
- Best use cases  
- When to avoid usage  
- Time and space complexity  
- Real-world applications  

---

### Custom Graph Input
- Import user-defined graphs using JSON  
- Export graph configurations  
- Load preset graph structures  

---

### Path Story and Analysis Panel
A detailed explanation of algorithm execution:
- Number of nodes visited  
- Traversal efficiency  
- Path cost and hops  
- Explanation of how the algorithm reached the result  

---

### Performance Metrics
Displays:
- Nodes visited  
- Total edges explored  
- Path cost  
- Number of steps taken  

---

### Scenario-Based Exploration ("What If" Analysis)
- Modify edge weights dynamically  
- Observe how path changes under different conditions  
- Compare algorithm stability and adaptability  

---

### Source and Target Selection
- Select custom start and end nodes  
- Analyze how graph structure impacts traversal  

---

## Architecture
Graph Input (User / Preset)
↓
Algorithm Selection Layer
↓
Execution Engine
↓
Traversal Tracking
↓
Metrics & Analysis
↓
UI Visualization & Insights Panel

---

## Key Design Focus

- Making algorithm behavior visually intuitive  
- Enabling direct comparison between multiple algorithms  
- Bridging theory (DSA) with practical understanding  
- Providing insight, not just output  

---

## Contributions and Enhancements

- Designed a unified interface to execute and compare multiple shortest path algorithms  
- Integrated real-time visualization with execution controls for better understanding  
- Built an analysis layer that explains algorithm behavior through metrics and narrative ("Path Story")  
- Added scenario testing features to study algorithm performance under changing conditions  
- Enabled user-defined graph input via JSON for flexible experimentation  

---

## Future Improvements

### Advanced Graph Editing
- Drag-and-drop node creation  
- Manual edge weight editing  

---

### Heuristic Customization (A*)
- Allow users to define custom heuristics  
- Compare heuristic impact on performance  

---

### Algorithm Comparison Mode
- Run multiple algorithms simultaneously  
- Side-by-side performance comparison  

---

### Large Graph Optimization
- Improve performance for dense graphs  
- Introduce virtualization techniques  

---

### Visualization Enhancements
- Edge weight animations  
- Heatmaps for frequently visited nodes  

---

### Educational Mode
- Step-by-step explanation of each decision  
- Interactive learning overlays  

---

## Learning Outcomes

- Deep understanding of shortest path algorithms and their trade-offs  
- Insight into how graph structure affects algorithm performance  
- Experience in building interactive algorithm visualization systems  
- Improved understanding of real-time state management and UI synchronization  

---

## Example Use Case

- Comparing Dijkstra and A* on weighted graphs  
- Understanding why BFS fails on weighted graphs  
- Observing Bellman-Ford behavior with negative weights  
- Evaluating algorithm efficiency in dense vs sparse graphs  

---

## Final Note

PathFinder is not just a visualization tool; it is an analysis platform for understanding how algorithms behave in practical scenarios. It combines execution, metrics, and explanation to provide a complete learning and experimentation environment.
