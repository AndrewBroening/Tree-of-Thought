/**
 * State Management Module
 * Handles the tree data model and state machine
 */

// ===== GLOBAL STATE =====
let globalState = {
  mode: 'setup',           // 'setup', 'adding', 'exploring', 'marking'
  problem: {
    name: '',
    goalState: '',
    startState: ''
  },
  tree: {
    nodes: {},             // id -> node
    rootId: null,
    activeNodeId: null,
    solved: false,
    solvedNodeId: null
  },
  selectedOtherCandidate: null  // For "Try Different" in exploring mode
};

// ===== OBSERVERS =====
let observers = [];

function subscribe(callback) {
  observers.push(callback);
}

function notifyObservers() {
  observers.forEach(cb => cb(globalState));
}

// ===== STATE MACHINE TRANSITIONS =====

/**
 * Switch to SETUP mode
 */
function goToSetup() {
  globalState.mode = 'setup';
  globalState.problem = { name: '', goalState: '', startState: '' };
  globalState.tree = { nodes: {}, rootId: null, activeNodeId: null, solved: false, solvedNodeId: null };
  globalState.selectedOtherCandidate = null;
  notifyObservers();
}

/**
 * Create a new problem and switch to ADDING mode
 */
function createProblem(name, startState, goalState = '') {
  globalState.problem = { name, startState, goalState };
  
  // Create root node at depth 0
  const rootNode = createNode('0', startState, null, 0);
  globalState.tree.nodes = { '0': rootNode };
  globalState.tree.rootId = '0';
  globalState.tree.activeNodeId = '0';
  globalState.tree.solved = false;
  globalState.tree.solvedNodeId = null;
  
  globalState.mode = 'adding';
  globalState.selectedOtherCandidate = null;
  notifyObservers();
}

/**
 * Add a candidate to the active node
 */
function addCandidate(moveText, resultState, score) {
  const activeId = globalState.tree.activeNodeId;
  const node = globalState.tree.nodes[activeId];
  
  if (!node) return false;
  
  const candidate = {
    text: moveText,
    result: resultState,
    score: parseInt(score),
    index: node.candidates.length,
    exploredToNodeId: undefined  // Explicitly mark as not yet explored
  };
  
  node.candidates.push(candidate);
  notifyObservers();
  return true;
}

/**
 * Get count of candidates on active node
 */
function getCandidateCount() {
  const activeId = globalState.tree.activeNodeId;
  const node = globalState.tree.nodes[activeId];
  return node ? node.candidates.length : 0;
}

/**
 * Get candidates for active node
 */
function getActiveCandidates() {
  const activeId = globalState.tree.activeNodeId;
  const node = globalState.tree.nodes[activeId];
  return node ? node.candidates : [];
}

/**
 * Update candidate score
 */
function updateCandidateScore(index, newScore) {
  const activeId = globalState.tree.activeNodeId;
  const node = globalState.tree.nodes[activeId];
  
  if (!node || !node.candidates[index]) return false;
  
  node.candidates[index].score = parseInt(newScore);
  notifyObservers();
  return true;
}

/**
 * Switch to EXPLORING mode
 */
function goToExploring() {
  globalState.mode = 'exploring';
  globalState.selectedOtherCandidate = null;
  notifyObservers();
}

/**
 * Get best candidate (highest score among unexplored candidates)
 */
function getBestCandidate() {
  const candidates = getActiveCandidates();
  if (candidates.length === 0) return null;
  
  // Get unexplored candidates
  const unexploredCandidates = candidates.filter(cand => !cand.exploredToNodeId);
  
  // If all candidates are explored, return null
  if (unexploredCandidates.length === 0) return null;
  
  // Find highest score among unexplored candidates
  return unexploredCandidates.reduce((best, cand) => 
    cand.score > best.score ? cand : best
  );
}

/**
 * Select a different candidate to explore
 */
function selectOtherCandidate(index) {
  globalState.selectedOtherCandidate = index;
  notifyObservers();
}

/**
 * Get the candidate to explore (best or selected other)
 */
function getSelectedCandidate() {
  if (globalState.selectedOtherCandidate !== null) {
    const candidates = getActiveCandidates();
    return candidates[globalState.selectedOtherCandidate] || null;
  }
  return getBestCandidate();
}

/**
 * Expand a candidate (create new child node)
 */
function expandCandidate() {
  const activeId = globalState.tree.activeNodeId;
  const selected = getSelectedCandidate();
  
  if (!selected) return false;
  
  // Create new node with selected candidate's result state
  const activeNode = globalState.tree.nodes[activeId];
  const newNodeId = String(Object.keys(globalState.tree.nodes).length);
  const newDepth = activeNode.depth + 1;  // Child is one level deeper
  const newNode = createNode(newNodeId, selected.result, activeId, newDepth);
  globalState.tree.nodes[newNodeId] = newNode;
  
  // Mark this candidate as explored
  selected.exploredToNodeId = newNodeId;
  console.log(`[expandCandidate] Explored "${selected.text}" from depth ${activeNode.depth} to depth ${newDepth} (node ${newNodeId}`);
  
  // Switch to new node in MARKING mode so user can evaluate the new state first
  globalState.tree.activeNodeId = newNodeId;
  globalState.mode = 'marking';
  globalState.selectedOtherCandidate = null;
  notifyObservers();
  
  return true;
}

/**
 * Go back to parent and determine next action
 * Core principle: At each layer, check if there are unexplored candidates
 * If yes: stay and explore. If no: cascade up only if layer is completely exhausted
 */
function goToParent() {
  const currentId = globalState.tree.activeNodeId;
  const currentNode = globalState.tree.nodes[currentId];
  
  if (!currentNode || currentNode.parent === null) {
    return false;  // Can't go higher
  }
  
  const parentId = currentNode.parent;
  const parentNode = globalState.tree.nodes[parentId];
  
  // Move to parent
  globalState.tree.activeNodeId = parentId;
  globalState.selectedOtherCandidate = null;
  
  // Count unexplored candidates at this layer
  let unexploredCount = 0;
  for (let i = 0; i < parentNode.candidates.length; i++) {
    if (!parentNode.candidates[i].exploredToNodeId) {
      unexploredCount++;
    }
  }
  
  // Determine mode based on layer exhaustion state
  if (unexploredCount > 0) {
    // Layer still has candidates to explore - stay here
    globalState.mode = 'exploring';
  } else if (parentNode.depth === 0 && parentNode.candidates.length < 3) {
    // Root with unexplored slot - ask for more candidates
    globalState.mode = 'adding';
  } else {
    // Layer exhausted - cascade to parent
    if (!parentNode.isDeadEnd) {
      parentNode.isDeadEnd = true;
      goToParent();  // Recursive cascade
      return true;
    }
  }
  
  notifyObservers();
  return true;
}



/**
 * Mark current node as dead-end
 */
function markDeadEnd() {
  const activeId = globalState.tree.activeNodeId;
  const node = globalState.tree.nodes[activeId];
  
  if (node) {
    node.isDeadEnd = true;
    
    // Auto-reset the candidate's score to 0 (the one that led here)
    if (node.parent) {
      const parentNode = globalState.tree.nodes[node.parent];
      const candidateThatLedHere = parentNode.candidates.find(
        cand => cand.exploredToNodeId === activeId
      );
      if (candidateThatLedHere) {
        candidateThatLedHere.score = 0;
      }
    }
    
    notifyObservers();
  }
  
  // Auto-backtrack to parent (cascade logic is now integrated in goToParent())
  goToParent();
}

/**
 * Mark current node as goal/solved
 */
function markSolved() {
  const activeId = globalState.tree.activeNodeId;
  
  globalState.tree.solved = true;
  globalState.tree.solvedNodeId = activeId;
  notifyObservers();
  
  return true;
}

/**
 * Try more candidates from current node (stay in ADDING)
 */
function tryMoreCandidates() {
  globalState.mode = 'adding';
  globalState.selectedOtherCandidate = null;
  notifyObservers();
}

/**
 * Get solution path (root to solved node)
 */
function getSolutionPath() {
  if (!globalState.tree.solved || !globalState.tree.solvedNodeId) {
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
 * Get solution steps as readable text
 */
function getSolutionSteps() {
  const path = getSolutionPath();
  const steps = [];
  
  steps.push(`Step 0: ${path[0].state} — Start`);
  
  for (let i = 1; i < path.length; i++) {
    const prevNode = path[i - 1];
    const currNode = path[i];
    
    // Find the candidate that led here
    const candidate = prevNode.candidates.find(c => c.exploredToNodeId === currNode.id);
    const moveText = candidate ? candidate.text : 'Move';
    const moveScore = candidate ? candidate.score : '?';
    
    steps.push(`Step ${i}: ${prevNode.state} → ${moveText} [${moveScore}] → ${currNode.state}`);
  }
  
  return steps;
}

// ===== HELPER FUNCTIONS =====

/**
 * Create a node object
 */
function createNode(id, state, parent, depth = 0) {
  return {
    id,
    state,
    parent,
    depth,              // Track how deep in the tree this node is
    candidates: [],
    isDeadEnd: false
  };
}

/**
 * Get active node
 */
function getActiveNode() {
  const activeId = globalState.tree.activeNodeId;
  return globalState.tree.nodes[activeId] || null;
}

/**
 * Get path to active node as string
 */
function getPathString() {
  const path = [];
  let currentId = globalState.tree.activeNodeId;
  
  while (currentId !== null) {
    const node = globalState.tree.nodes[currentId];
    path.unshift(node.state);
    currentId = node.parent;
  }
  
  if (path.length === 0) return 'start';
  return path.join(' → ') + ' ← you are here';
}

/**
 * Reset to setup
 */
function reset() {
  goToSetup();
}

// ===== EXPORTS =====
export {
  globalState,
  subscribe,
  notifyObservers,
  goToSetup,
  createProblem,
  addCandidate,
  getCandidateCount,
  getActiveCandidates,
  goToExploring,
  getBestCandidate,
  selectOtherCandidate,
  getSelectedCandidate,
  expandCandidate,
  goToParent,
  markDeadEnd,
  markSolved,
  tryMoreCandidates,
  getSolutionPath,
  getSolutionSteps,
  getActiveNode,
  getPathString,
  reset,
  updateCandidateScore
};
