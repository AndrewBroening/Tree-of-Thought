/**
 * Render Module
 * Displays the correct UI mode based on state
 */

import {
  globalState,
  getActiveCandidates,
  getCandidateCount,
  getBestCandidate,
  getActiveNode,
  getPathString,
  getSolutionSteps,
  updateCandidateScore
} from './state.js';

// ===== SCORE EDIT MODAL =====

/**
 * Open the score edit modal for a candidate
 */
function openScoreEditModal(candidateIndex, candidateText, currentScore) {
  const modal = document.getElementById('modal-score-edit');
  const backdrop = document.getElementById('modal-backdrop');
  const label = document.getElementById('score-edit-label');
  const slider = document.getElementById('score-edit-slider');
  const display = document.getElementById('score-edit-display');
  const saveBtn = document.getElementById('btn-score-save');
  const cancelBtn = document.getElementById('btn-score-cancel');
  const closeBtn = document.getElementById('btn-score-close');

  label.textContent = `Edit score for "${candidateText}":`;
  slider.value = currentScore;
  display.textContent = currentScore;

  // Update display when slider changes
  slider.addEventListener('input', () => {
    display.textContent = slider.value;
  });

  // Save handler
  const handleSave = () => {
    const newScore = Math.max(1, Math.min(10, parseInt(slider.value)));
    updateCandidateScore(candidateIndex, newScore);
    closeScoreEditModal();
  };

  // Close handlers
  const handleClose = () => {
    closeScoreEditModal();
  };

  // Remove old listeners by cloning
  const newSaveBtn = saveBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  const newCloseBtn = closeBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

  document.getElementById('btn-score-save').addEventListener('click', handleSave);
  document.getElementById('btn-score-cancel').addEventListener('click', handleClose);
  document.getElementById('btn-score-close').addEventListener('click', handleClose);
  backdrop.addEventListener('click', handleClose);

  // Show modal
  modal.classList.add('active');
  backdrop.classList.add('active');
}

/**
 * Close the score edit modal
 */
function closeScoreEditModal() {
  const modal = document.getElementById('modal-score-edit');
  const backdrop = document.getElementById('modal-backdrop');
  modal.classList.remove('active');
  backdrop.classList.remove('active');
}

// ===== TREE VISUALIZATION =====

/**
 * Render the entire tree recursively as nested DOM nodes
 * Replaces Cytoscape with custom HTML-based tree display
 */
export function renderTree() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  
  // Get root node
  const rootId = globalState.tree.rootId;
  if (!rootId) {
    canvas.innerHTML = '<div class="tree-placeholder">No problem created yet</div>';
    return;
  }
  
  const rootNode = globalState.tree.nodes[rootId];
  if (!rootNode) {
    canvas.innerHTML = '<div class="tree-placeholder">Error: root node not found</div>';
    return;
  }
  
  // Render tree starting from root
  canvas.innerHTML = renderNodeRecursive(rootNode, 0);
}

/**
 * Recursively render a node and its children
 */
function renderNodeRecursive(node, depth) {
  const isActive = node.id === globalState.tree.activeNodeId;
  const isSolved = node.id === globalState.tree.solvedNodeId;
  
  const stateClass = [
    'state-node',
    isActive ? 'active' : '',
    isSolved ? 'solved' : '',
    node.isDeadEnd ? 'dead-end' : ''
  ].filter(c => c).join(' ');
  
  let html = `
    <div class="tree-node-container" style="margin-left: ${depth * 30}px">
      <div class="${stateClass}" data-node-id="${node.id}">
        ${escapeHtml(node.state)}
      </div>
      <div class="candidates-wrapper">
  `;
  
  // Render candidates
  node.candidates.forEach((cand, idx) => {
    const candClass = [
      'candidate-node',
      cand.isDeadEnd ? 'dead-end' : '',
      cand.exploredToNodeId ? 'explored' : 'potential'
    ].filter(c => c).join(' ');
    
    html += `
      <div class="${candClass}" data-parent-id="${node.id}" data-cand-index="${idx}">
        <span class="cand-text">${escapeHtml(cand.text)}</span>
        <span class="cand-result">${escapeHtml(cand.result)}</span>
        <span class="cand-score">[${cand.score}]</span>
    `;
    
    // If explored, recursively render child state
    if (cand.exploredToNodeId) {
      const childNode = globalState.tree.nodes[cand.exploredToNodeId];
      if (childNode) {
        html += `<div class="child-tree">${renderNodeRecursive(childNode, depth + 1)}</div>`;
      }
    }
    
    html += `</div>`;
  });
  
  html += `
      </div>
    </div>
  `;
  
  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ===== HIDE ALL MODES =====
function hideAllModes() {
  document.querySelectorAll('.mode').forEach(m => m.classList.remove('active'));
}

// ===== RENDER FUNCTIONS BY MODE =====

/**
 * Render SETUP mode
 */
export function renderSetup() {
  hideAllModes();
  const mode = document.getElementById('mode-setup');
  mode.classList.add('active');
  
  // Clear form
  document.getElementById('form-setup').reset();
  document.getElementById('input-problem-name').focus();
}

/**
 * Render ADDING mode
 */
export function renderAdding() {
  hideAllModes();
  const mode = document.getElementById('mode-adding');
  mode.classList.add('active');
  
  const node = getActiveNode();
  if (!node) return;
  
  // Update header
  document.getElementById('state-label').textContent = node.state;
  document.getElementById('path-info').textContent = getPathString();
  
  // Update counter
  const count = getCandidateCount();
  document.getElementById('counter-candidates').textContent = `${count} of 3`;
  
  // Update candidates list
  renderCandidatesList();
  
  // Enable/disable explore button
  const exploreBtn = document.getElementById('btn-adding-explore');
  exploreBtn.disabled = count < 3;
  
  // Clear form for new candidate
  document.getElementById('form-add-candidate').reset();
  document.getElementById('input-score').value = 5;
  document.getElementById('score-display').textContent = '5';
  document.getElementById('input-move').focus();
}

/**
 * Render candidates list with editable scores
 */
function renderCandidatesList() {
  const list = document.getElementById('candidates-list-added');
  const candidates = getActiveCandidates();
  
  list.innerHTML = '';
  
  candidates.forEach((cand, idx) => {
    const li = document.createElement('li');
    li.style.cursor = 'pointer';
    li.style.padding = '8px';
    li.style.borderRadius = '3px';
    li.style.transition = 'background 0.2s';
    li.textContent = `✓ ${cand.text} → ${cand.result} [${cand.score}] (click to edit score)`;
    
    li.addEventListener('mouseenter', () => {
      li.style.background = '#f0f0f0';
    });
    li.addEventListener('mouseleave', () => {
      li.style.background = 'transparent';
    });
    
    li.addEventListener('click', () => {
      openScoreEditModal(idx, cand.text, cand.score);
    });
    
    list.appendChild(li);
  });
}

/**
 * Render EXPLORING mode
 */
export function renderExploring() {
  hideAllModes();
  const mode = document.getElementById('mode-exploring');
  mode.classList.add('active');
  
  const node = getActiveNode();
  if (!node) return;
  
  // Update header
  document.getElementById('state-label-explore').textContent = node.state;
  document.getElementById('path-info-explore').textContent = getPathString();
  
  // Get best candidate
  const best = getBestCandidate();
  if (!best) return;
  
  // Render best candidate
  document.getElementById('best-text').textContent = best.text;
  document.getElementById('best-result').textContent = best.result;
  document.getElementById('best-score').textContent = `[${best.score}]`;
  
  // Render other candidates
  renderOtherCandidates();
}

/**
 * Render other candidates list
 */
function renderOtherCandidates() {
  const list = document.getElementById('other-candidates-list');
  const candidates = getActiveCandidates();
  const best = getBestCandidate();
  
  list.innerHTML = '';
  
  candidates.forEach((cand, index) => {
    if (cand === best) return; // Skip best (already shown above)
    
    const li = document.createElement('li');
    li.textContent = `${cand.text} → ${cand.result} [${cand.score}]`;
    li.dataset.index = index;
    li.addEventListener('click', () => {
      document.querySelectorAll('.other-candidates-list li').forEach(el => {
        el.classList.remove('selected');
      });
      li.classList.add('selected');
    });
    
    list.appendChild(li);
  });
}

/**
 * Render MARKING mode
 */
export function renderMarking() {
  hideAllModes();
  const mode = document.getElementById('mode-marking');
  mode.classList.add('active');
  
  const node = getActiveNode();
  if (!node) return;
  
  // Update header
  document.getElementById('state-label-mark').textContent = node.state;
  document.getElementById('path-info-mark').textContent = getPathString();
  
  // Disable back button if at root
  const backBtn = document.getElementById('btn-mark-back');
  backBtn.disabled = node.parent === null;
}

/**
 * Render solution modal
 */
export function renderSolutionModal() {
  const steps = getSolutionSteps();
  const pathList = document.getElementById('solution-path');
  
  pathList.innerHTML = '';
  steps.forEach(step => {
    const li = document.createElement('li');
    li.textContent = step;
    pathList.appendChild(li);
  });
  
  document.getElementById('modal-solution').style.display = 'block';
  document.getElementById('modal-backdrop').style.display = 'block';
}

/**
 * Hide solution modal
 */
export function hideSolutionModal() {
  document.getElementById('modal-solution').style.display = 'none';
  document.getElementById('modal-backdrop').style.display = 'none';
}

/**
 * Update breadcrumb
 */
export function updateBreadcrumb() {
  const state = globalState;
  let text = 'Ready to start';
  
  if (state.mode === 'setup') {
    text = 'Create New Problem';
  } else if (state.mode === 'adding') {
    const activeId = state.tree.activeNodeId;
    const node = state.tree.nodes[activeId];
    text = node ? `Adding candidates for ${node.state}` : 'Adding candidates';
  } else if (state.mode === 'exploring') {
    const activeId = state.tree.activeNodeId;
    const node = state.tree.nodes[activeId];
    text = node ? `Exploring from ${node.state}` : 'Exploring';
  } else if (state.mode === 'marking') {
    const activeId = state.tree.activeNodeId;
    const node = state.tree.nodes[activeId];
    text = node ? `Marking ${node.state}` : 'Marking state';
  }
  
  document.getElementById('breadcrumb').textContent = text;
}

/**
 * Main render function - called when state changes
 */
export function render(state) {
  updateBreadcrumb();
  
  switch (state.mode) {
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
  }
}

/**
 * Update score display as slider changes
 */
export function setupScoreSlider() {
  const slider = document.getElementById('input-score');
  const display = document.getElementById('score-display');
  
  slider.addEventListener('input', (e) => {
    display.textContent = e.target.value;
  });
}
