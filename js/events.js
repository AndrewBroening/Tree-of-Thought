/**
 * Events Module (Refactored)
 * Handles all button clicks and form submissions
 */

// ===== SETUP MODE =====

function setupSetupEvents() {
  const form = document.getElementById('form-setup');
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const startThought = document.getElementById('input-start-thought').value.trim();
    
    if (!startThought) {
      alert('Please fill in the Problem / Starting Thought');
      return;
    }
    
    createProblem(startThought);
  });
}

// ===== ADDING MODE =====

function setupAddingEvents() {
  const form = document.getElementById('form-add-thought');
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const thought = document.getElementById('input-thought').value.trim();
    
    if (!thought) {
      return;  // Just silently ignore empty thoughts
    }
    
    // Use default score of 5 since we removed the score input
    const score = 5;
    addThought(thought, score);
    
    // Clear form after adding
    document.getElementById('input-thought').value = '';
    document.getElementById('input-thought').focus();
  });
  
  document.getElementById('btn-adding-explore').addEventListener('click', () => {
    goToExploring();
  });
}

// ===== EXPLORING MODE =====

function setupExploringEvents() {
  document.getElementById('btn-explore-best').addEventListener('click', () => {
    exploreThought();
  });
}

// ===== MARKING MODE =====

function setupMarkingEvents() {
  document.getElementById('btn-mark-dead-end').addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    markDeadEnd();
  });
  
  document.getElementById('btn-mark-create-branch').addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    tryMoreThoughts();
  });
  
  document.getElementById('btn-mark-goal').addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    markSolved();
    renderSolutionModal();
  });
}

// ===== EXHAUSTED MODE =====

function setupExhaustedEvents() {
  document.getElementById('btn-exhausted-add-more').addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    addMoreCandidatesAtLayer();
  });
  
  document.getElementById('btn-exhausted-mark-dead').addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    continueExhaustedCascade();
  });
}

// ===== HEADER =====

function setupHeaderEvents() {
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('Reset the entire app? All progress will be lost.')) {
      location.reload();
    }
  });
}

// ===== MODALS =====

function setupModalEvents() {
  document.getElementById('btn-modal-close').addEventListener('click', hideSolutionModal);
  document.getElementById('modal-backdrop').addEventListener('click', hideSolutionModal);
  
  document.getElementById('btn-modal-copy').addEventListener('click', () => {
    const steps = Array.from(document.getElementById('solution-path').children)
      .map(li => li.textContent)
      .join('\n');
    navigator.clipboard.writeText(steps).then(() => {
      alert('Solution path copied!');
    });
  });
  
  document.getElementById('btn-modal-explore').addEventListener('click', () => {
    hideSolutionModal();
  });
}

// ===== TREE CANVAS =====

function setupTreeEvents() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  
  canvas.addEventListener('click', (e) => {
    const thoughtNode = e.target.closest('.thought-node');
    if (thoughtNode) {
      const nodeId = thoughtNode.getAttribute('data-node-id');
      console.log('Clicked thought node:', nodeId);
    }
  });
}

// ===== SETUP ALL =====

function setupAllEvents() {
  setupSetupEvents();
  setupAddingEvents();
  setupExploringEvents();
  setupMarkingEvents();
  setupExhaustedEvents();
  setupHeaderEvents();
  setupModalEvents();
}

// ===== MAKE FUNCTIONS AVAILABLE GLOBALLY =====
window.setupSetupEvents = setupSetupEvents;
window.setupAddingEvents = setupAddingEvents;
window.setupExploringEvents = setupExploringEvents;
window.setupMarkingEvents = setupMarkingEvents;
window.setupExhaustedEvents = setupExhaustedEvents;
window.setupHeaderEvents = setupHeaderEvents;
window.setupModalEvents = setupModalEvents;
window.setupTreeEvents = setupTreeEvents;
window.setupAllEvents = setupAllEvents;
