/**
 * Events Module
 * Handles all button clicks and form submissions
 */

import {
  createProblem,
  addCandidate,
  getCandidateCount,
  goToExploring,
  selectOtherCandidate,
  expandCandidate,
  goToParent,
  markDeadEnd,
  markSolved,
  tryMoreCandidates,
  goToSetup,
  reset
} from './state.js';

import { renderSolutionModal, hideSolutionModal, setupScoreSlider } from './render.js';

// ===== SETUP MODE EVENTS =====

export function setupSetupEvents() {
  const form = document.getElementById('form-setup');
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('input-problem-name').value.trim();
    const start = document.getElementById('input-start-state').value.trim();
    const goal = document.getElementById('input-goal').value.trim();
    
    if (!name || !start) {
      alert('Please fill in Problem Name and Starting State');
      return;
    }
    
    createProblem(name, start, goal);
  });
}

// ===== ADDING MODE EVENTS =====

export function setupAddingEvents() {
  const form = document.getElementById('form-add-candidate');
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const move = document.getElementById('input-move').value.trim();
    const result = document.getElementById('input-result-state').value.trim();
    const score = document.getElementById('input-score').value;
    
    addCandidate(move, result, score);
    
    // Clear form after adding
    document.getElementById('input-move').value = '';
    document.getElementById('input-result-state').value = '';
    document.getElementById('input-score').value = '5';
  });
  
  document.getElementById('btn-adding-explore').addEventListener('click', () => {
    goToExploring();
  });
}

function setupCandidateCounter() {
  // This is called whenever candidates change
  // Check if we have >= 3 and enable explore button
  // Button is part of the UI, will be enabled via render
}

// ===== EXPLORING MODE EVENTS =====

export function setupExploringEvents() {
  document.getElementById('btn-explore-best').addEventListener('click', () => {
    expandCandidate();
  });
  
  document.getElementById('btn-explore-different').addEventListener('click', () => {
    const list = document.getElementById('other-candidates-list');
    const selected = list.querySelector('li.selected');
    
    if (selected) {
      const index = parseInt(selected.dataset.index);
      selectOtherCandidate(index);
    } else {
      alert('Please select a different candidate first');
    }
  });
  
  document.getElementById('btn-explore-back').addEventListener('click', () => {
    goToParent();
  });
}

// ===== MARKING MODE EVENTS =====

export function setupMarkingEvents() {
  document.getElementById('btn-mark-back').addEventListener('click', () => {
    goToParent();
  });
  
  document.getElementById('btn-mark-dead-end').addEventListener('click', () => {
    markDeadEnd();
  });
  
  document.getElementById('btn-mark-try-more').addEventListener('click', () => {
    tryMoreCandidates();
  });
  
  document.getElementById('btn-mark-goal').addEventListener('click', () => {
    markSolved();
    renderSolutionModal();
  });
}

// ===== HEADER BUTTONS =====

export function setupHeaderEvents() {
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('Reset the entire app? All progress will be lost.')) {
      location.reload();
    }
  });
}

// ===== MODAL EVENTS =====

export function setupModalEvents() {
  document.getElementById('btn-modal-close').addEventListener('click', hideSolutionModal);
  document.getElementById('modal-backdrop').addEventListener('click', hideSolutionModal);
  
  document.getElementById('btn-modal-copy').addEventListener('click', () => {
    // Copy solution path to clipboard
    const steps = Array.from(document.getElementById('solution-path').children)
      .map(li => li.textContent)
      .join('\n');
    navigator.clipboard.writeText(steps).then(() => {
      alert('Solution path copied to clipboard!');
    });
  });
  
  document.getElementById('btn-modal-explore').addEventListener('click', () => {
    hideSolutionModal();
    // Stay in marking mode, user can continue exploring
  });
}

// ===== TREE CANVAS EVENTS =====

/**
 * Setup event listeners for tree nodes in the canvas
 */
export function setupTreeEvents() {
  // Note: Canvas uses event delegation since tree is re-rendered frequently
  const canvas = document.getElementById('canvas');
  
  if (canvas) {
    canvas.addEventListener('click', (e) => {
      const stateNode = e.target.closest('.state-node');
      if (stateNode) {
        const nodeId = stateNode.getAttribute('data-node-id');
        if (nodeId) {
          // TODO: Handle node click - may navigate or highlight in UI
          console.log('Clicked state node:', nodeId);
        }
      }
      
      const candNode = e.target.closest('.candidate-node');
      if (candNode) {
        const parentId = candNode.getAttribute('data-parent-id');
        const candIndex = candNode.getAttribute('data-cand-index');
        if (parentId && candIndex !== null) {
          // TODO: Handle candidate click
          console.log('Clicked candidate:', parentId, candIndex);
        }
      }
    });
  }
}

// ===== HELPER: Setup key constraints =====

export function setupConstraints() {
  // Disable explore button if < 3 candidates in ADDING mode
  // This is checked by adding a data attribute and checked on render
}

// ===== MAIN EVENT SETUP =====

export function setupAllEvents() {
  setupSetupEvents();
  setupAddingEvents();
  setupExploringEvents();
  setupMarkingEvents();
  setupHeaderEvents();
  setupModalEvents();
  setupScoreSlider();
  setupConstraints();
}
