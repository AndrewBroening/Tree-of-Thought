/**
 * Layout Module
 * Calculates positions for a top-down tree visualization
 * 
 * Algorithm:
 * - Each depth level is assigned a fixed Y position
 * - Child nodes are centered horizontally under their parent
 * - Positions are calculated recursively from root to leaves
 */

const LEVEL_SPACING = 140;      // Vertical spacing between tree levels (pixels)
const NODE_WIDTH = 180;          // Width of each node box (pixels)
const NODE_HEIGHT = 80;          // Height of each node box (pixels)
const SIBLINGS_GAP = 40;         // Minimum horizontal gap between sibling nodes (pixels)
const PADDING = 40;              // Padding around entire tree (pixels)

/**
 * Calculate positions for all nodes in the tree
 * 
 * @param {Object} tree - The tree data structure from globalState.tree
 * @param {number} containerWidth - Width of the canvas container (pixels)
 * @param {number} containerHeight - Height of the canvas container (pixels)
 * @returns {Object} nodePositions - { nodeId: { x, y, width, height } }
 */
function calculateNodePositions(tree, containerWidth, containerHeight) {
  if (!tree.rootId || !tree.nodes[tree.rootId]) {
    return {};
  }
  
  const nodePositions = {};
  const depthMap = {}; // Map of depth -> list of nodes at that depth
  
  // First pass: collect all nodes and determine their depths
  const collectNodes = (nodeId, depth = 0) => {
    if (!depthMap[depth]) depthMap[depth] = [];
    depthMap[depth].push(nodeId);
    
    const node = tree.nodes[nodeId];
    if (node && node.children) {
      node.children.forEach(childId => collectNodes(childId, depth + 1));
    }
  };
  
  collectNodes(tree.rootId);
  
  // Second pass: calculate X positions for each node
  // Start with root at center
  const xPositions = {};
  
  Object.keys(depthMap).forEach(depth => {
    const nodesAtDepth = depthMap[depth];
    const depthNode = tree.nodes[nodesAtDepth[0]];
    
    // Calculate total width needed for this level
    const totalWidth = nodesAtDepth.length * NODE_WIDTH + 
                       (nodesAtDepth.length - 1) * SIBLINGS_GAP;
    
    // Start position so nodes are centered
    let startX = (containerWidth - totalWidth) / 2;
    startX = Math.max(PADDING, Math.min(startX, containerWidth - totalWidth - PADDING));
    
    // Assign X positions
    nodesAtDepth.forEach((nodeId, idx) => {
      xPositions[nodeId] = startX + idx * (NODE_WIDTH + SIBLINGS_GAP);
    });
  });
  
  // Third pass: build position objects
  Object.keys(depthMap).forEach(depth => {
    const y = parseInt(depth) * LEVEL_SPACING + PADDING;
    
    depthMap[depth].forEach(nodeId => {
      nodePositions[nodeId] = {
        x: xPositions[nodeId],
        y: y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        depth: parseInt(depth)
      };
    });
  });
  
  return nodePositions;
}

/**
 * Calculate bounding box of all positioned nodes
 * 
 * @param {Object} nodePositions - { nodeId: { x, y, width, height } }
 * @returns {Object} { minX, minY, maxX, maxY, width, height }
 */
function calculateBoundingBox(nodePositions) {
  const nodes = Object.values(nodePositions);
  
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  nodes.forEach(pos => {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + pos.width);
    maxY = Math.max(maxY, pos.y + pos.height);
  });
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Calculate zoom and transform to fit tree within container
 * 
 * @param {Object} boundingBox - From calculateBoundingBox()
 * @param {number} containerWidth - Canvas container width
 * @param {number} containerHeight - Canvas container height
 * @returns {Object} { scale, translateX, translateY }
 */
function calculateZoomToFit(boundingBox, containerWidth, containerHeight) {
  const paddingTop = 20;           // Padding at the top
  const paddingHorizontal = 20;   // Padding on left and right
  const paddingBottom = 80;        // Padding at the bottom for breathing room
  
  // Calculate available space
  const availableWidth = containerWidth - (paddingHorizontal * 2);
  const availableHeight = containerHeight - (paddingTop + paddingBottom);
  
  // Calculate scale to fit both horizontally and vertically
  let scale = 1;
  if (boundingBox.width > 0 && boundingBox.height > 0) {
    const scaleX = availableWidth / boundingBox.width;
    const scaleY = availableHeight / boundingBox.height;
    scale = Math.min(scaleX, scaleY, 1); // Never zoom in, only out
  }
  
  // Align tree to top, centered horizontally
  const scaledWidth = boundingBox.width * scale;
  
  // Horizontal centering
  const translateX = paddingHorizontal + (availableWidth - scaledWidth) / 2 - boundingBox.minX * scale;
  // Vertical alignment to top
  const translateY = paddingTop - boundingBox.minY * scale;
  
  return { scale, translateX, translateY };
}

/**
 * Get connection points for drawing lines between parent and child
 * 
 * @param {Object} parentPos - Parent node position { x, y, width, height }
 * @param {Object} childPos - Child node position { x, y, width, height }
 * @returns {Object} { fromX, fromY, toX, toY }
 */
function getConnectionPoints(parentPos, childPos) {
  // Parent connection point: center bottom
  const fromX = parentPos.x + parentPos.width / 2;
  const fromY = parentPos.y + parentPos.height;
  
  // Child connection point: center top
  const toX = childPos.x + childPos.width / 2;
  const toY = childPos.y;
  
  return { fromX, fromY, toX, toY };
}

/**
 * Create SVG path for a bezier curve between two points
 * 
 * @param {Object} connection - From getConnectionPoints()
 * @returns {string} SVG path data string
 */
function createBezierPath(connection) {
  const { fromX, fromY, toX, toY } = connection;
  
  // Control points for bezier curve (vertical curve)
  const controlY = (fromY + toY) / 2;
  
  return `M ${fromX} ${fromY} C ${fromX} ${controlY}, ${toX} ${controlY}, ${toX} ${toY}`;
}

// ===== MAKE FUNCTIONS AVAILABLE GLOBALLY =====
window.calculateNodePositions = calculateNodePositions;
window.calculateBoundingBox = calculateBoundingBox;
window.calculateZoomToFit = calculateZoomToFit;
window.getConnectionPoints = getConnectionPoints;
window.createBezierPath = createBezierPath;

/**
 * Export configuration for reference
 */
window.layoutConfig = {
  LEVEL_SPACING,
  NODE_WIDTH,
  NODE_HEIGHT,
  SIBLINGS_GAP,
  PADDING
};
