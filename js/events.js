/**
 * Events Module (Refactored)
 * Handles all button clicks and form submissions
 */

// ===== HELPERS =====

/**
 * Setup a click handler that prevents default and stops propagation
 */
function setupClickHandler(elementId, callback) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element not found: ${elementId}`);
    return;
  }
  
  element.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    callback(e);
  });
}

// ===== SETUP MODE =====

function setupSetupGoalEvents() {
  const form = document.getElementById('form-setup-goal');
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const goal = document.getElementById('input-goal').value.trim();
    
    if (!goal) {
      alert('Please enter your goal');
      return;
    }
    
    // Save goal to state and move to next step
    globalState.problem.goal = goal;
    goToSetupThought();
  });
}

function setupSetupEvents() {
  const form = document.getElementById('form-setup');
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const startThought = document.getElementById('input-start-thought').value.trim();
    
    if (!startThought) {
      alert('Please enter your starting thought');
      return;
    }
    
    createProblem(globalState.problem.goal, startThought);
  });
}

// ===== ADDING MODE =====

function setupAddingEvents() {
  const form = document.getElementById('form-add-thought');
  
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const thought = document.getElementById('input-thought');
    if (!thought) return;
    
    const thoughtText = thought.value.trim();
    if (!thoughtText) return;
    
    // Use default score of 5 since we removed the score input
    const score = 5;
    addThought(thoughtText, score);
    
    // Clear form after adding
    thought.value = '';
    thought.focus();
  });
  
  setupClickHandler('btn-adding-explore', () => {
    exploreThought();
  });
  
  setupClickHandler('btn-adding-mark-dead-end', () => {
    markDeadEnd();
  });
  
  setupClickHandler('btn-adding-mark-goal', () => {
    markSolved();
    renderSolutionModal();
  });
}

// ===== EXPLORING MODE =====

function setupExploringEvents() {
  setupClickHandler('btn-explore-best', () => {
    exploreThought();
  });
}

// ===== MARKING MODE =====

function setupMarkingEvents() {
  setupClickHandler('btn-mark-dead-end', () => {
    markDeadEnd();
  });
  
  setupClickHandler('btn-mark-create-branch', () => {
    tryMoreThoughts();
  });
  
  setupClickHandler('btn-mark-goal', () => {
    markSolved();
    renderSolutionModal();
  });
}

// ===== EXHAUSTED MODE =====

function setupExhaustedEvents() {
  setupClickHandler('btn-exhausted-add-more', () => {
    addMoreCandidatesAtLayer();
  });
  
  setupClickHandler('btn-exhausted-mark-dead', () => {
    continueExhaustedCascade();
  });
}

// ===== HEADER =====

function setupHeaderEvents() {
  document.getElementById('btn-reset').addEventListener('click', () => {
    location.reload();
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
  setupSetupGoalEvents();
  setupSetupEvents();
  setupAddingEvents();
  setupExploringEvents();
  setupMarkingEvents();
  setupExhaustedEvents();
  setupHeaderEvents();
  setupModalEvents();
}

// ===== MAKE FUNCTIONS AVAILABLE GLOBALLY =====
window.setupClickHandler = setupClickHandler;
window.setupSetupGoalEvents = setupSetupGoalEvents;
window.setupSetupEvents = setupSetupEvents;
window.setupAddingEvents = setupAddingEvents;
window.setupExploringEvents = setupExploringEvents;
window.setupMarkingEvents = setupMarkingEvents;
window.setupExhaustedEvents = setupExhaustedEvents;
window.setupHeaderEvents = setupHeaderEvents;
window.setupModalEvents = setupModalEvents;
window.setupTreeEvents = setupTreeEvents;
window.setupAllEvents = setupAllEvents;
