/**
 * App Bootstrap Module
 * Initializes the application
 */

// Make state accessible globally for debugging and event handlers
window.appDispatch = function(action) {
  if (action.type === 'UPDATE_STATE') {
    Object.assign(window.appState, action.state);
    window.notifyObservers();
  }
};

/**
 * Initialize the entire application
 */
function initApp() {
  // Subscribe to state changes: render UI panels + tree canvas
  window.subscribe((state) => {
    window.render(state);
    window.renderTree();
  });
  
  // Setup all event listeners
  window.setupAllEvents();
  window.setupTreeEvents();
  
  // Initial render
  window.render(window.globalState);
  window.renderTree();
  
  console.log('✅ Tree of Thought initialized');
}

// ===== MAKE FUNCTIONS AVAILABLE GLOBALLY =====
window.initApp = initApp;
window.appState = window.globalState;


