/**
 * Render Module (Refactored)
 * Displays UI based on current state and mode
 */

// ===== MAIN RENDER =====

function render(state) {
  hideAllModes();
  
  switch (state.mode) {
    case 'setup-goal':
      renderSetupGoal();
      break;
    case 'setup':
      renderSetup();
      break;
    case 'adding':
      renderAdding();
      break;
    case 'exploring':
      renderExploring();
      break;
    case 'marking':
      renderMarking();
      break;
    case 'exhausted':
      renderExhausted();
      break;
  }
  
  updateBreadcrumb();
}

// ===== TREE VISUALIZATION =====

/**
 * Get the active path: all nodeIds from root to activeNodeId (inclusive)
 */
function getActivePath() {
  const activePath = new Set();
  let currentId = globalState.tree.activeNodeId;
  
  while (currentId) {
    activePath.add(currentId);
    const node = globalState.tree.nodes[currentId];
    currentId = node?.parent || null;
  }
  
  return activePath;
}

/**
 * Render tree as top-down hierarchical visualization with SVG connections
 * and auto-zoom to fit
 */
function renderTree() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  
  const rootId = globalState.tree.rootId;
  if (!rootId) {
    canvas.innerHTML = '<div class="tree-placeholder">No problems to solve yet</div>';
    return;
  }
  
  const rootNode = globalState.tree.nodes[rootId];
  if (!rootNode) {
    canvas.innerHTML = '<div class="tree-placeholder">Error: root node not found</div>';
    return;
  }
  
  // Clear canvas
  canvas.innerHTML = '';
  
  // Get canvas dimensions
  const canvasRect = canvas.getBoundingClientRect();
  const containerWidth = canvasRect.width || canvas.offsetWidth || 800;
  const containerHeight = canvasRect.height || canvas.offsetHeight || 600;
  
  // Create main wrapper with flex layout
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';
  
  // Add goal title banner at the top if it exists
  if (globalState.problem.goal) {
    const goalBanner = document.createElement('div');
    goalBanner.className = 'tree-goal-banner';
    goalBanner.textContent = globalState.problem.goal;
    goalBanner.style.flexShrink = '0';
    goalBanner.style.padding = '16px';
    goalBanner.style.backgroundColor = '#f5f5f5';
    goalBanner.style.borderBottom = '2px solid #ddd';
    goalBanner.style.fontWeight = 'bold';
    goalBanner.style.fontSize = '16px';
    goalBanner.style.textAlign = 'center';
    goalBanner.style.whiteSpace = 'normal';
    goalBanner.style.wordWrap = 'break-word';
    goalBanner.style.overflowWrap = 'break-word';
    goalBanner.style.color = '#333';
    wrapper.appendChild(goalBanner);
  }
  
  // Calculate positions for all nodes
  const nodePositions = calculateNodePositions(globalState.tree, containerWidth, containerHeight);
  
  // Create container for positioned nodes
  const treeContainer = document.createElement('div');
  treeContainer.className = 'tree-container-positioned';
  treeContainer.style.position = 'relative';
  treeContainer.style.flex = '1';
  treeContainer.style.minHeight = '0';
  wrapper.appendChild(treeContainer);
  
  // Create SVG for connections
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'tree-connections-svg');
  svg.setAttribute('width', containerWidth);
  svg.setAttribute('height', containerHeight);
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.pointerEvents = 'none';
  
  treeContainer.appendChild(svg);
  
  // Render all nodes
  const activePath = getActivePath();
  const nodeElements = new Map();
  
  const renderNodeBox = (nodeId) => {
    const node = globalState.tree.nodes[nodeId];
    const pos = nodePositions[nodeId];
    if (!node || !pos) return;
    
    // Create node container
    const nodeBox = document.createElement('div');
    nodeBox.className = 'tree-node-box';
    nodeBox.style.position = 'absolute';
    nodeBox.style.left = pos.x + 'px';
    nodeBox.style.top = pos.y + 'px';
    nodeBox.style.width = pos.width + 'px';
    nodeBox.style.minHeight = pos.height + 'px';
    nodeBox.dataset.nodeId = nodeId;
    
    // Create node content container
    const content = document.createElement('div');
    content.className = 'tree-node-content';
    
    // Create thought display
    const isActive = activePath.has(nodeId);
    const isSolved = nodeId === globalState.tree.solvedNodeId;
    
    let thoughtClass = 'thought-display';
    if (isSolved) thoughtClass += ' solved';
    else if (node.isDeadEnd) thoughtClass += ' dead-end';
    else if (isActive) thoughtClass += ' active';
    else thoughtClass += ' unexplored';
    
    const thoughtDisplay = document.createElement('div');
    thoughtDisplay.className = thoughtClass;
    thoughtDisplay.textContent = node.thought;
    content.appendChild(thoughtDisplay);
    
    // Render unexplored thoughts if any
    if (node.unexploredThoughts && node.unexploredThoughts.length > 0) {
      const thoughtsContainer = document.createElement('div');
      thoughtsContainer.className = 'unexplored-thoughts';
      
      node.unexploredThoughts.forEach((thought, idx) => {
        const thoughtItem = document.createElement('div');
        thoughtItem.className = 'thought-item unexplored';
        thoughtItem.innerHTML = `
          <span class="thought-text">${escapeHtml(thought.thought)}</span>
          <span class="thought-probability">${(thought.probability || 0).toFixed(1)}%</span>
        `;
        thoughtsContainer.appendChild(thoughtItem);
      });
      
      content.appendChild(thoughtsContainer);
    }
    
    nodeBox.appendChild(content);
    treeContainer.appendChild(nodeBox);
    nodeElements.set(nodeId, { element: nodeBox, position: pos });
    
    // Render children recursively
    if (node.children && node.children.length > 0) {
      node.children.forEach(childId => renderNodeBox(childId));
    }
  };
  
  // Render all nodes starting from root
  renderNodeBox(rootId);
  
  // Draw SVG connections
  const renderConnections = (nodeId) => {
    const node = globalState.tree.nodes[nodeId];
    const parentPos = nodePositions[nodeId];
    
    if (node && node.children && parentPos) {
      node.children.forEach(childId => {
        const childPos = nodePositions[childId];
        if (childPos) {
          const connection = getConnectionPoints(parentPos, childPos);
          const pathData = createBezierPath(connection);
          
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', pathData);
          path.setAttribute('class', 'tree-connection-line');
          svg.appendChild(path);
        }
        
        // Recursively render connections for children
        renderConnections(childId);
      });
    }
  };
  
  renderConnections(rootId);
  
  // Calculate bounding box and apply zoom
  const boundingBox = calculateBoundingBox(nodePositions);
  const zoom = calculateZoomToFit(boundingBox, containerWidth, containerHeight);
  
  // Apply transform to tree container
  treeContainer.style.transformOrigin = '0 0';
  treeContainer.style.transform = `translate(${zoom.translateX}px, ${zoom.translateY}px) scale(${zoom.scale})`;
  
  canvas.appendChild(wrapper);
}

// ===== HIDE MODES =====

function hideAllModes() {
  document.querySelectorAll('.mode').forEach(m => m.classList.remove('active'));
}

// ===== RENDER BY MODE =====

/**
 * SETUP GOAL mode: Ask for the goal/problem
 */
function renderSetupGoal() {
  const mode = document.getElementById('mode-setup-goal');
  if (!mode) return;
  mode.classList.add('active');
  
  const form = document.getElementById('form-setup-goal');
  if (form) form.reset();
  
  // Focus on first input field
  const goalInput = document.getElementById('input-goal');
  if (goalInput) goalInput.focus();
}

/**
 * SETUP mode: Ask for the starting thought (after goal has been set)
 */
function renderSetup() {
  const mode = document.getElementById('mode-setup');
  if (!mode) return;
  mode.classList.add('active');
  
  // Show the goal preview banner
  const goalPreview = document.getElementById('goal-preview');
  if (goalPreview) {
    goalPreview.textContent = `Goal: ${globalState.problem.goal}`;
    goalPreview.style.display = globalState.problem.goal ? 'block' : 'none';
  }
  
  const form = document.getElementById('form-setup');
  if (form) form.reset();
  
  // Focus on starting thought input
  const startThoughtInput = document.getElementById('input-start-thought');
  if (startThoughtInput) startThoughtInput.focus();
}

/**
 * ADDING mode: Add thoughts to current node
 */
function renderAdding() {
  const mode = document.getElementById('mode-adding');
  mode?.classList.add('active');
  
  const activeNode = getActiveNode();
  if (!activeNode) return;
  
  // Update header
  const header = document.getElementById('current-thought');
  if (header) {
    header.textContent = `Current: ${activeNode.thought}`;
  }
  
  const pathInfo = document.getElementById('path-info');
  if (pathInfo) {
    pathInfo.textContent = `Path: ${getPathString()}`;
  }
  
  // Update thoughts list
  renderThoughtsList();
  
  // Reset form
  const thoughtInput = document.getElementById('input-thought');
  if (thoughtInput) thoughtInput.value = '';
  if (thoughtInput) thoughtInput.focus();
  
  // Update explore button state
  const exploreBtn = document.getElementById('btn-adding-explore');
  if (exploreBtn) {
    exploreBtn.disabled = activeNode.unexploredThoughts.length === 0;
  }
  
  // Show/hide evaluation buttons (only if not at root)
  const isRoot = globalState.tree.activeNodeId === globalState.tree.rootId;
  const markDeadEndBtn = document.getElementById('btn-adding-mark-dead-end');
  const markGoalBtn = document.getElementById('btn-adding-mark-goal');
  if (markDeadEndBtn) {
    markDeadEndBtn.style.display = isRoot ? 'none' : 'block';
  }
  if (markGoalBtn) {
    markGoalBtn.style.display = isRoot ? 'none' : 'block';
  }
  
  // Render probability slider if multiple thoughts
  renderProbabilitySlider();
}

/**
 * Render the list of added thoughts
 */
function renderThoughtsList() {
  const activeNode = getActiveNode();
  const table = document.getElementById('thoughts-list-added');
  if (!table || !activeNode) return;
  
  table.innerHTML = '';
  
  activeNode.unexploredThoughts.forEach((thought, idx) => {
    const column = document.createElement('div');
    column.className = 'thought-column';
    const prob = (thought.probability || 0).toFixed(1);
    
    const textSpan = document.createElement('span');
    textSpan.className = 'thought-text';
    textSpan.textContent = thought.thought;
    
    const probSpan = document.createElement('span');
    probSpan.className = 'thought-probability';
    probSpan.textContent = `${prob}%`;
    
    column.appendChild(textSpan);
    column.appendChild(probSpan);
    column.addEventListener('click', () => {
      // Could enable thought selection here
    });
    table.appendChild(column);
  });
  
  // Update counter
  const counter = document.getElementById('counter-thoughts');
  if (counter) {
    counter.textContent = activeNode.unexploredThoughts.length;
  }
}

/**
 * EXPLORING mode: Choose which thought to explore
 */
function renderExploring() {
  const mode = document.getElementById('mode-exploring');
  mode?.classList.add('active');
  
  const activeNode = getActiveNode();
  const thoughts = getUnexploredThoughts();
  
  if (!activeNode || thoughts.length === 0) {
    return;
  }
  
  // Update header
  const pathInfo = document.getElementById('path-info-explore');
  if (pathInfo) {
    pathInfo.textContent = `Path: ${getPathString()}`;
  }
  
  // Get best thought
  const bestThought = getBestThought();
  if (bestThought) {
    const bestThoughtElem = document.getElementById('best-thought');
    if (bestThoughtElem) bestThoughtElem.textContent = bestThought.thought;
  }
  
  // Render other thoughts list
  const list = document.getElementById('other-thoughts-list');
  if (list) {
    list.innerHTML = '';
    
    thoughts.forEach((thought, idx) => {
      // Skip the best thought in the "other" list
      if (bestThought && thought === bestThought) return;
      
      const li = document.createElement('li');
      li.className = 'thought-item';
      li.dataset.index = idx;
      li.innerHTML = `
        <span class="thought-text">${escapeHtml(thought.thought)}</span>
      `;
      li.addEventListener('click', () => {
        li.classList.add('selected');
        // Deselect others
        list.querySelectorAll('li').forEach(item => {
          if (item !== li) item.classList.remove('selected');
        });
      });
      list.appendChild(li);
    });
  }
}

/**
 * MARKING mode: Evaluate current thought
 */
function renderMarking() {
  const mode = document.getElementById('mode-marking');
  mode?.classList.add('active');
  
  const activeNode = getActiveNode();
  if (!activeNode) return;
  
  // Update header
  const header = document.getElementById('current-thought-mark');
  if (header) {
    header.textContent = `Evaluating: ${activeNode.thought}`;
  }
  
  // Path is shown automatically from template
}

/**
 * EXHAUSTED mode: All candidates in layer tested, choose what to do
 */
function renderExhausted() {
  const mode = document.getElementById('mode-exhausted');
  mode?.classList.add('active');
  
  const activeNode = getActiveNode();
  if (!activeNode) return;
  
  // Update header
  const header = document.getElementById('current-thought-exhausted');
  if (header) {
    header.textContent = `Layer: ${activeNode.thought} (all candidates tested)`;
  }
  
  const pathInfo = document.getElementById('path-info-exhausted');
  if (pathInfo) {
    pathInfo.textContent = `Path: ${getPathString()}`;
  }
}

// ===== SOLUTION MODAL =====

function renderSolutionModal() {
  const steps = getSolutionSteps();
  const modal = document.getElementById('modal-solution');
  const backdrop = document.getElementById('modal-backdrop');
  
  const pathList = document.getElementById('solution-path');
  if (pathList) {
    pathList.innerHTML = '';
    steps.forEach(step => {
      const li = document.createElement('li');
      li.textContent = step;
      pathList.appendChild(li);
    });
  }
  
  modal?.classList.add('active');
  backdrop?.classList.add('active');
}

function hideSolutionModal() {
  const modal = document.getElementById('modal-solution');
  const backdrop = document.getElementById('modal-backdrop');
  modal?.classList.remove('active');
  backdrop?.classList.remove('active');
}

// ===== HELPERS =====

function updateBreadcrumb() {
  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) {
    const mode = globalState.mode.toUpperCase();
    const thought = getActiveNode()?.thought || 'Setup';
    breadcrumb.textContent = `${mode} • ${thought}`;
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Render the multi-knob probability slider
 */
function renderProbabilitySlider() {
  const activeNode = getActiveNode();
  if (!activeNode || activeNode.unexploredThoughts.length === 0) {
    // Hide slider if no thoughts
    const slider = document.getElementById('probability-slider-container');
    if (slider) slider.style.display = 'none';
    return;
  }
  
  const count = activeNode.unexploredThoughts.length;
  const thoughts = getUnexploredThoughts();
  const slider = document.getElementById('probability-slider-container');
  
  if (!slider) return;
  slider.style.display = 'block';
  
  // Clear existing knobs and segments
  const knobsContainer = document.getElementById('probability-slider-knobs');
  if (knobsContainer) {
    knobsContainer.innerHTML = '';
    
    // Create the slider track
    const track = document.createElement('div');
    track.className = 'slider-track';
    knobsContainer.appendChild(track);
    
    // Create colored probability segments
    let positionStart = 0;
    let knobPositions = [];
    
    if (count >= 2) {
      knobPositions = getKnobPositions();
    }
    
    // Create segments for each candidate
    thoughts.forEach((thought, idx) => {
      let regionStart, regionEnd;
      
      if (count === 1) {
        // Single candidate: full width
        regionStart = 0;
        regionEnd = 100;
      } else {
        if (idx === 0) {
          regionStart = 0;
          regionEnd = knobPositions[0];
        } else if (idx === count - 1) {
          regionStart = knobPositions[knobPositions.length - 1];
          regionEnd = 100;
        } else {
          regionStart = knobPositions[idx - 1];
          regionEnd = knobPositions[idx];
        }
      }
      
      // Create segment div
      const segment = document.createElement('div');
      segment.className = 'probability-segment';
      segment.style.left = regionStart + '%';
      segment.style.width = (regionEnd - regionStart) + '%';
      
      // Calculate opacity: base opacity (0.6) * probability (0-1)
      const probabilityDecimal = thought.probability / 100;
      const opacity = 2 * probabilityDecimal;
      segment.style.opacity = opacity;
      
      knobsContainer.appendChild(segment);
    });
    
    // Only create knobs if there are 2+ thoughts (need N-1 knobs for N candidates)
    if (count >= 2) {
      const knobPositions = getKnobPositions();
      
      // Create draggable knobs for each boundary
      knobPositions.forEach((pos, idx) => {
        const knobWrapper = document.createElement('div');
        knobWrapper.className = 'knob-wrapper';
        knobWrapper.style.left = pos + '%';
        
        const knob = document.createElement('div');
        knob.className = 'probability-knob draggable';
        knob.dataset.knobIndex = idx;
        knob.title = `Knob ${idx + 1}`;
        
        knobWrapper.appendChild(knob);
        knobWrapper.addEventListener('mousedown', (e) => startDragging(e, knobWrapper, knobsContainer));
        
        knobsContainer.appendChild(knobWrapper);
      });
    }
  }
  
  // Update probability display
  updateProbabilityDisplay();
}

/**
 * Start dragging a knob
 */
function startDragging(e, knobWrapper, container) {
  if (e.button !== 0) return; // Only left mouse button
  
  e.preventDefault();
  const knobIndex = parseInt(knobWrapper.querySelector('.probability-knob').dataset.knobIndex);
  
  const containerRect = container.getBoundingClientRect();
  const containerWidth = containerRect.width;
  
  const handleMouseMove = (moveEvent) => {
    const newX = moveEvent.clientX - containerRect.left;
    let newPercent = (newX / containerWidth) * 100;
    
    // Clamp between 0-100
    newPercent = Math.max(0, Math.min(100, newPercent));
    
    // Get current knob positions
    const allKnobs = container.querySelectorAll('.knob-wrapper');
    const positions = Array.from(allKnobs).map(k => parseFloat(k.style.left));
    
    // Enforce knob ordering - can't cross neighbors
    if (knobIndex > 0 && newPercent <= positions[knobIndex - 1]) {
      newPercent = positions[knobIndex - 1] + 1; // At least 1% gap
    }
    if (knobIndex < positions.length - 1 && newPercent >= positions[knobIndex + 1]) {
      newPercent = positions[knobIndex + 1] - 1; // At least 1% gap
    }
    
    knobWrapper.style.left = newPercent + '%';
  };
  
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    knobWrapper.classList.remove('dragging');
    
    // Finalize positions and update state
    const allKnobs = container.querySelectorAll('.knob-wrapper');
    const newPositions = Array.from(allKnobs).map(k => parseFloat(k.style.left));
    updateThoughtProbabilities(newPositions);
  };
  
  knobWrapper.classList.add('dragging');
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

/**
 * Update probability percentage display with centered positioning
 */
function updateProbabilityDisplay() {
  const thoughts = getUnexploredThoughts();
  const display = document.getElementById('probability-display');
  const activeNode = getActiveNode();
  
  if (!display || !activeNode) return;
  
  const count = thoughts.length;
  let positions = [];
  
  if (count === 0) {
    display.innerHTML = '';
    return;
  }
  
  if (count === 1) {
    // Single candidate: center at 50%
    positions = [50];
  } else {
    // Multiple candidates: calculate center of each region based on knob positions
    const knobPositions = getKnobPositions();
    
    for (let i = 0; i < count; i++) {
      let regionStart, regionEnd;
      
      if (i === 0) {
        regionStart = 0;
        regionEnd = knobPositions[0];
      } else if (i === count - 1) {
        regionStart = knobPositions[knobPositions.length - 1];
        regionEnd = 100;
      } else {
        regionStart = knobPositions[i - 1];
        regionEnd = knobPositions[i];
      }
      
      const center = (regionStart + regionEnd) / 2;
      positions.push(center);
    }
  }
  
  // Render probability items with absolute positioning
  display.innerHTML = thoughts
    .map((t, idx) => `<span class="prob-item" style="left: ${positions[idx]}%">${(t.probability || 0).toFixed(1)}%</span>`)
    .join('');
}

// ===== MAKE FUNCTIONS AVAILABLE GLOBALLY =====
window.render = render;
window.renderTree = renderTree;
window.renderSolutionModal = renderSolutionModal;
window.hideSolutionModal = hideSolutionModal;
