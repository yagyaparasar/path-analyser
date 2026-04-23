# Algorithm Intelligence Panel - Feature Guide

## Overview
The PathFinder application now includes a dynamic **Algorithm Intelligence Panel** that provides real-time insights and warnings based on the selected pathfinding algorithm and current graph properties.

## Features

### 1. Algorithm Intelligence Panel
Located in the sidebar, this panel displays comprehensive information for each algorithm:

- **✓ Best Use Case**: Scenarios where the algorithm excels
- **✗ Avoid When**: Situations where the algorithm should not be used
- **⏱ Complexity**: Both time and space complexity
- **🌍 Real-World Example**: Practical applications of the algorithm

The panel updates instantly when you switch algorithms—no page reload required.

### 2. Smart Warning System
The application analyzes your graph in real-time and displays contextual warnings:

#### Warning Types:

**🔴 Error (Red)**: Critical issues that will cause incorrect results
- Example: Using Dijkstra's algorithm with negative edge weights
- Action: Provides a quick-switch button to the recommended algorithm

**🟡 Warning (Yellow)**: Suboptimal algorithm choices
- Example: Using BFS on a weighted graph (ignores weights)
- Example: Using DFS when shortest path is needed
- Action: Suggests better alternatives

**🔵 Info (Blue)**: Performance optimization suggestions
- Example: Using Bellman-Ford when no negative weights exist
- Action: Recommends faster algorithms like Dijkstra or A*

### 3. Centralized Algorithm Configuration
All algorithm metadata is stored in `src/js/algorithms.js` in the `ALGORITHMS` object:

```javascript
{
  name: "Algorithm Name",
  description: "Brief description",
  complexity: "O(notation)",
  spaceComplexity: "O(notation)",
  bestUseCase: "When to use this algorithm",
  avoidWhen: "When NOT to use this algorithm",
  realWorldExample: "Practical application",
  requiresNonNegative: true/false
}
```

## Testing the Features

### Test Negative Weights Warning
1. Import the provided `test-negative-weights.json` file
2. Select **Dijkstra's** algorithm
3. Observe the red error warning about negative weights
4. Click "Switch to Bellman-Ford" to resolve the issue

### Test Algorithm Intelligence
1. Select different algorithms (BFS, DFS, Dijkstra, A*, Bellman-Ford)
2. Watch the Intelligence Panel update instantly with relevant information
3. Compare time/space complexity across algorithms

### Test Performance Suggestions
1. Load the default preset graph (all positive weights)
2. Select **Bellman-Ford**
3. Observe the blue info message suggesting faster alternatives

## Technical Implementation

### Graph Analysis
The `analyzeGraph()` function in `src/js/graph.js` examines:
- Presence of negative edge weights
- Min/max/average edge weights
- Node and edge counts

### Warning Logic
Warnings are generated in a `useEffect` hook that monitors:
- Selected algorithm
- Graph structure changes
- Algorithm requirements vs. graph properties

### Dynamic Updates
The system uses React state management to ensure:
- Instant updates when switching algorithms
- Real-time warnings when importing new graphs
- No page reloads or manual refreshes needed

## Benefits

1. **Educational**: Learn when and why to use each algorithm
2. **Error Prevention**: Avoid incorrect results from algorithm misuse
3. **Performance**: Get suggestions for faster algorithms
4. **User-Friendly**: One-click fixes for common issues

## Future Enhancements
Potential additions:
- Cycle detection warnings
- Graph density analysis
- Algorithm performance predictions
- Custom graph property checks
