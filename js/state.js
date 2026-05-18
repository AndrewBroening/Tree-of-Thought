/**
 * State Management Module (Refactored)
 * Simplified tree-of-thought structure
 * Data model: Nodes contain thoughts. Unexplored thoughts become children when explored.
 */

// ===== GLOBAL STATE =====
let globalState = {
  mode: 'setup',              // 'setup', 'adding', 'exploring', 'marking', 'exhausted'
  problem: {
    name: '',
    startThought: ''           // Single text field (no separate goal state needed)
  },
  tree: {
    nodes: {},                 // nodeId -> node
    rootId: null,
    activeNodeId: null,
    solvedNodeId: null
  },
  selectedThoughtIndex: null   // Which unexplored thought user selected to explore
};

// Prevent concurrent execution and duplicate clicks
let isProcessing = false;
let lastMarkDeadEndTime = 0;

// ===== OBSERVERS =====
let observers = [];

function subscribe(callback) {
  observers.push(callback);
}

function notifyObservers() {
  observers.forEach(cb => cb(globalState));
}

// ===== STATE MACHINE =====

function goToSetup() {
  globalState.mode = 'setup';
  globalState.problem = { name: '', startThought: '' };
  globalState.tree = { nodes: {}, rootId: null, activeNodeId: null, solvedNodeId: null };
  globalState.selectedThoughtIndex = null;
  notifyObservers();
}

/**
 * Create new problem: single thought as starting point
 */
function createProblem(startThought) {
  globalState.problem = { name: startThought, startThought };
  
  // Create root node with the starting thought
  const rootNode = createNode('0', startThought, null, 0);
  globalState.tree.nodes = { '0': rootNode };
  globalState.tree.rootId = '0';
  globalState.tree.activeNodeId = '0';
  globalState.tree.solvedNodeId = null;
  
  globalState.mode = 'adding';
  globalState.selectedThoughtIndex = null;
  notifyObservers();
}

/**
 * Add an unexplored thought to the active node
 * Thoughts stay unexplored until user chooses to explore them
 */
/**
 * Calculate equal probabilities for N items
 * Returns array of knob positions: for N items, need N-1 knobs
 * Example: 3 items → 2 knobs at [33.33, 66.67]
 */
function calculateEqualKnobPositions(count) {
  if (count <= 1) return [];
  
  const knobs = [];
  for (let i = 1; i < count; i++) {
    knobs.push((i * 100) / count);
  }
  return knobs;
}

/**
 * Calculate probabilities from knob positions
 * With N candidates and N-1 knobs, calculate probability for each candidate
 */
function calculateProbabilitiesFromKnobs(count, knobPositions) {
  const probs = [];
  
  if (count === 1) {
    return [100];
  }
  
  // First candidate: 0 to knob[0]
  probs.push(knobPositions[0]);
  
  // Middle candidates: knob[i-1] to knob[i]
  for (let i = 1; i < knobPositions.length; i++) {
    probs.push(knobPositions[i] - knobPositions[i - 1]);
  }
  
  // Last candidate: knob[n-2] to 100
  probs.push(100 - knobPositions[knobPositions.length - 1]);
  
  return probs;
}

/**
 * Add thought and calculate probabilities
 */
function addThought(thoughtText, score) {
  const activeId = globalState.tree.activeNodeId;
  const node = globalState.tree.nodes[activeId];
  
  if (!node) return false;
  
  // Calculate new probabilities for all thoughts (including this new one)
  const newCount = node.unexploredThoughts.length + 1;
  const knobPositions = calculateEqualKnobPositions(newCount);
  const probabilities = calculateProbabilitiesFromKnobs(newCount, knobPositions);
  
  // Update existing thoughts with new probabilities
  node.unexploredThoughts.forEach((thought, idx) => {
    thought.probability = probabilities[idx];
  });
  
  // Add new thought with its probability
  node.unexploredThoughts.push({
    thought: thoughtText,
    score: parseInt(score),
    probability: probabilities[newCount - 1],
    index: node.unexploredThoughts.length
  });
  
  // Store knob positions on the node for later editing
  if (!node.knobPositions) {
    node.knobPositions = [];
  }
  node.knobPositions = knobPositions;
  
  notifyObservers();
  return true;
}

/**
 * Update probabilities when knobs are adjusted
 */
function updateThoughtProbabilities(knobPositions) {
  const activeId = globalState.tree.activeNodeId;
  const node = globalState.tree.nodes[activeId];
  
  if (!node) return false;
  
  const count = node.unexploredThoughts.length;
  const probabilities = calculateProbabilitiesFromKnobs(count, knobPositions);
  
  node.unexploredThoughts.forEach((thought, idx) => {
    thought.probability = probabilities[idx];
  });
  
  node.knobPositions = knobPositions;
  notifyObservers();
  return true;
}

/**
 * Get unexplored thoughts at active node
 */
function getUnexploredThoughts() {
  const activeId = globalState.tree.activeNodeId;
  const node = globalState.tree.nodes[activeId];
  return node ? node.unexploredThoughts : [];
}

/**
 * Get best unexplored thought (highest probability)
 */
function getBestThought() {
  const thoughts = getUnexploredThoughts();
  if (thoughts.length === 0) return null;
  
  return thoughts.reduce((best, thought) =>
    (thought.probability || 0) > (best.probability || 0) ? thought : best
  );
}

/**
 * Get knob positions for current layer
 */
function getKnobPositions() {
  const node = getActiveNode();
  if (!node || !node.knobPositions) {
    const count = getUnexploredThoughts().length;
    return calculateEqualKnobPositions(count);
  }
  return node.knobPositions;
}

/**
 * Select a specific unexplored thought by index
 */
function selectThought(index) {
  globalState.selectedThoughtIndex = index;
  notifyObservers();
}

/**
 * Get the thought to explore (best or user-selected)
 */
function getSelectedThought() {
  if (globalState.selectedThoughtIndex !== null) {
    const thoughts = getUnexploredThoughts();
    return thoughts[globalState.selectedThoughtIndex] || null;
  }
  return getBestThought();
}

/**
 * Enter EXPLORING mode at current node
 */
function goToExploring() {
  globalState.mode = 'exploring';
  globalState.selectedThoughtIndex = null;
  notifyObservers();
}

/**
 * Explore a thought: create child node and navigate to it
 */
function exploreThought() {
  const activeId = globalState.tree.activeNodeId;
  const activeNode = globalState.tree.nodes[activeId];
  const selected = getSelectedThought();
  
  if (!activeNode || !selected) return false;
  
  // Create child node for this thought
  const newNodeId = String(Object.keys(globalState.tree.nodes).length);
  const newDepth = activeNode.depth + 1;
  const newNode = createNode(newNodeId, selected.thought, activeId, newDepth);
  
  globalState.tree.nodes[newNodeId] = newNode;
  
  // Move thought from unexplored to explored (add as child reference)
  activeNode.children.push(newNodeId);
  
  // Remove from unexplored
  const idx = activeNode.unexploredThoughts.indexOf(selected);
  if (idx > -1) {
    activeNode.unexploredThoughts.splice(idx, 1);
  }
  
  // Move to child node in MARKING mode
  globalState.tree.activeNodeId = newNodeId;
  globalState.mode = 'marking';
  globalState.selectedThoughtIndex = null;
  
  notifyObservers();
  return true;
}

/**
 * Go back to parent node
 * Decision: if unexplored thoughts remain, switch to exploring
 *          if not, cascade up (mark parent dead if needed)
 */
function goToParent() {
  const currentId = globalState.tree.activeNodeId;
  const currentNode = globalState.tree.nodes[currentId];
  
  console.log('\n>>> goToParent() called');
  console.log('Current:', currentId, currentNode?.thought);
  
  if (!currentNode || !currentNode.parent) {
    console.log('No parent - at root');
    return false;  // Can't go higher than root
  }
  
  const parentId = currentNode.parent;
  const parentNode = globalState.tree.nodes[parentId];
  
  console.log('Parent:', parentId, parentNode?.thought);
  console.log('Parent unexplored thoughts:', parentNode?.unexploredThoughts);
  
  // Move to parent
  globalState.tree.activeNodeId = parentId;
  globalState.selectedThoughtIndex = null;
  
  // Check if parent has unexplored thoughts
  if (parentNode.unexploredThoughts.length > 0) {
    // Stay at this layer and explore remaining thoughts
    console.log('✓ Parent has', parentNode.unexploredThoughts.length, 'unexplored - staying in EXPLORING mode');
    globalState.mode = 'exploring';
    notifyObservers();  // Notify immediately to render at this layer
    return true;
  }
  
  if (parentNode.parent === null) {
    // At root with no unexplored - can add more
    console.log('✓ At ROOT with no unexplored - switching to ADDING mode');
    globalState.mode = 'adding';
    notifyObservers();  // Notify immediately to render at this layer
    return true;
  }
  
  // Non-root layer exhausted - show decision screen instead of auto-cascading
  console.log('✗ No unexplored at parent - showing EXHAUSTED decision screen');
  globalState.mode = 'exhausted';
  notifyObservers();  // Notify to render decision screen at this layer
  return true;
}

/**
 * Mark current thought as dead-end
 */
function markDeadEnd() {
  const now = Date.now();
  
  // Prevent duplicate calls within 200ms (debounce)
  if (now - lastMarkDeadEndTime < 200) {
    return;
  }
  lastMarkDeadEndTime = now;
  
  if (isProcessing) {
    return;
  }
  isProcessing = true;
  
  try {
    const activeId = globalState.tree.activeNodeId;
    const node = globalState.tree.nodes[activeId];
    
    if (!node) return;
    
    node.isDeadEnd = true;
    
    if (!node.parent) return; // Already at root
    
    const parentNode = globalState.tree.nodes[node.parent];
    
    // Move to parent and decide whether to cascade or stay
    globalState.tree.activeNodeId = node.parent;
    globalState.selectedThoughtIndex = null;
    
    // Check if parent has unexplored thoughts
    if (parentNode.unexploredThoughts && parentNode.unexploredThoughts.length > 0) {
      // STOP HERE - parent has unexplored thoughts to explore
      globalState.mode = 'exploring';
      notifyObservers();
      return;
    }
    
    // Parent has no unexplored thoughts
    if (!parentNode.parent) {
      // At root - switch to adding mode
      globalState.mode = 'adding';
      notifyObservers();
      return;
    }
    
    // Parent is exhausted - show decision screen
    globalState.mode = 'exhausted';
    notifyObservers();
    
  } finally {
    isProcessing = false;
  }
}

/**
 * User decided to cascade from exhausted layer
 */
function continueExhaustedCascade() {
  const activeId = globalState.tree.activeNodeId;
  const node = globalState.tree.nodes[activeId];
  
  if (!node || !node.parent) return; // Should not happen
  
  const parentNode = globalState.tree.nodes[node.parent];
  node.isDeadEnd = true;
  
  // Move to parent
  globalState.tree.activeNodeId = node.parent;
  globalState.selectedThoughtIndex = null;
  
  // Check if parent has unexplored thoughts
  if (parentNode.unexploredThoughts && parentNode.unexploredThoughts.length > 0) {
    // Parent has unexplored - explore them
    globalState.mode = 'exploring';
    notifyObservers();
    return;
  }
  
  // Parent has no unexplored thoughts
  if (!parentNode.parent) {
    // At root - switch to adding mode
    globalState.mode = 'adding';
    notifyObservers();
    return;
  }
  
  // Parent is also exhausted - show exhausted screen for parent
  globalState.mode = 'exhausted';
  notifyObservers();
}

/**
 * User decided to add more candidates at current layer
 */
function addMoreCandidatesAtLayer() {
  globalState.mode = 'adding';
  notifyObservers();
}

/**
 * Mark current node as solution/goal
 */
function markSolved() {
  globalState.tree.solvedNodeId = globalState.tree.activeNodeId;
  notifyObservers();
  return true;
}

/**
 * Switch to ADDING mode to add more thoughts
 */
function tryMoreThoughts() {
  globalState.mode = 'adding';
  globalState.selectedThoughtIndex = null;
  notifyObservers();
}

/**
 * Get solution path from root to solved node
 */
function getSolutionPath() {
  if (!globalState.tree.solvedNodeId) {
    return [];
  }
  
  const path = [];
  let currentId = globalState.tree.solvedNodeId;
  
  while (currentId !== null) {
    const node = globalState.tree.nodes[currentId];
    path.unshift(node);
    currentId = node.parent;
  }
  
  return path;
}

/**
 * Get solution as readable steps
 */
function getSolutionSteps() {
  const path = getSolutionPath();
  if (path.length === 0) return [];
  
  const steps = [`Starting Thought: ${path[0].thought}`];
  
  for (let i = 1; i < path.length; i++) {
    steps.push(`→ ${path[i].thought} [Score: ${path[i].score}]`);
  }
  
  return steps;
}

// ===== HELPER FUNCTIONS =====

/**
 * Create a node: represents a thought in the tree
 * 
 * Structure:
 * - thought: the text of this thought
 * - score: how promising this thought is (set when created from parent's unexplored list)
 * - parent: parent node ID
 * - depth: how deep in tree
 * - unexploredThoughts: array of {thought, score} - future children
 * - children: array of explored child node IDs
 * - isDeadEnd: whether this path was exhausted
 */
function createNode(id, thought, parent, depth = 0) {
  return {
    id,
    thought,
    score: 5,              // Default score, will be overridden when created from parent
    parent,
    depth,
    unexploredThoughts: [],  // {thought, score} objects waiting to be explored
    children: [],            // IDs of explored child nodes
    isDeadEnd: false
  };
}

/**
 * Get the active node
 */
function getActiveNode() {
  const id = globalState.tree.activeNodeId;
  return globalState.tree.nodes[id] || null;
}

/**
 * Get path as string for display
 */
function getPathString() {
  const path = [];
  let currentId = globalState.tree.activeNodeId;
  
  while (currentId !== null) {
    const node = globalState.tree.nodes[currentId];
    path.unshift(node.thought);
    currentId = node.parent;
  }
  
  if (path.length === 0) return '';
  return path.join(' → ');
}

/**
 * Reset to setup
 */
function reset() {
  goToSetup();
}

// ===== MAKE FUNCTIONS AVAILABLE GLOBALLY =====
window.globalState = globalState;
window.subscribe = subscribe;
window.notifyObservers = notifyObservers;
window.goToSetup = goToSetup;
window.createProblem = createProblem;
window.addThought = addThought;
window.getUnexploredThoughts = getUnexploredThoughts;
window.getBestThought = getBestThought;
window.selectThought = selectThought;
window.getSelectedThought = getSelectedThought;
window.goToExploring = goToExploring;
window.exploreThought = exploreThought;
window.goToParent = goToParent;
window.markDeadEnd = markDeadEnd;
window.markSolved = markSolved;
window.tryMoreThoughts = tryMoreThoughts;
window.continueExhaustedCascade = continueExhaustedCascade;
window.addMoreCandidatesAtLayer = addMoreCandidatesAtLayer;
window.getSolutionPath = getSolutionPath;
window.getSolutionSteps = getSolutionSteps;
window.getActiveNode = getActiveNode;
window.getPathString = getPathString;
window.getKnobPositions = getKnobPositions;
window.updateThoughtProbabilities = updateThoughtProbabilities;
window.calculateEqualKnobPositions = calculateEqualKnobPositions;
window.calculateProbabilitiesFromKnobs = calculateProbabilitiesFromKnobs;
window.reset = reset;
