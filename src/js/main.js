// Import jQuery and make it global
import jQuery from "jquery";
window.jQuery = jQuery;
window.$ = jQuery;

import paper from "paper";
import * as metroflow from "./metroflow";
import { DisplaySettings } from "./utils/util";
import { hasUndo, hasRedo, undo, redo } from "./utils/revision";
import * as zoom from "./utils/zoom";

// Import editor modules
import { ToolMode, DEFAULT_DRAW_SETTINGS } from "./editor/constants";
import {
  initializeToolbar,
  initializeSidebar,
  initializeZoomControls,
  getToolMode,
  isSnapEnabled,
  setDrawSettings,
  getCurrentTrack,
  getLastStation,
  setLastStation,
} from "./editor/ui";
import {
  handleSelectToolClick,
  handleStationCreation,
  handleMinorStationCreation,
  handleDragInSelectMode,
  handleMouseUpInSelectMode,
} from "./editor/handlers";
import { initializeContextMenus } from "./editor/contextmenu";

// Import jQuery Context Menu
import "jquery-contextmenu/dist/jquery.contextMenu";
import "jquery-contextmenu/dist/jquery.contextMenu.css";

// Import CSS
import "../css/metroflow-editor.css";

// Example maps will be loaded dynamically
let example1, example2;

// State management
let selectedStation = null;
let dragging = false;

// Create default draw settings
const drawSettings = { ...DEFAULT_DRAW_SETTINGS };

// Initialize jQuery UI after jQuery is global
const loadJQueryUI = async () => {
  await import("jquery-ui/dist/jquery-ui.js");
  await import("jquery-ui/dist/themes/base/jquery-ui.css");
};

// Initialize application when DOM is ready
$(document).ready(async () => {
  // Load jQuery UI
  await loadJQueryUI();

  // Initialize Paper.js
  const canvas = document.getElementById("paperCanvas");
  paper.setup(canvas);

  // Create a new project
  const project = new paper.Project(canvas);
  paper.view.zoom = 1;
  paper.view.center = new paper.Point(
    paper.view.size.width / 2,
    paper.view.size.height / 2
  );

  // Initialize MetroFlow
  const app = metroflow.initialize(canvas);

  // Initialize zoom and pan
  zoom.enableZoomOnCanvas(canvas);
  zoom.enablePanning(canvas);
  zoom.setCurrentMap(app.map);

  // Share draw settings with UI module
  setDrawSettings(drawSettings);

  // Initialize UI components
  initializeToolbar(app);
  initializeSidebar(app);
  initializeZoomControls();
  initializeContextMenus(app);

  // Initialize event handlers
  paper.view.onMouseDown = (event) => {
    const currentToolMode = getToolMode();
    switch (currentToolMode) {
      case ToolMode.SELECT:
        handleSelectToolClick(event, app, {
          selectedStation,
          setSelectedStation: (s) => (selectedStation = s),
        });
        break;
      case ToolMode.MAJOR_STATION:
      case ToolMode.NEW_TRACK:
        handleStationCreation(event, app, {
          currentTrack: getCurrentTrack(),
          snapEnabled: isSnapEnabled(),
          lastStation: getLastStation(),
          selectedStation,
          setLastStation,
          setSelectedStation: (s) => (selectedStation = s),
          drawSettings,
        });
        break;
      case ToolMode.MINOR_STATION:
        handleMinorStationCreation(event, app, { drawSettings });
        break;
    }
  };

  paper.view.onMouseDrag = (event) => {
    const currentToolMode = getToolMode();
    if (
      [ToolMode.SELECT, ToolMode.MAJOR_STATION, ToolMode.NEW_TRACK].includes(
        currentToolMode
      )
    ) {
      handleDragInSelectMode(event, app, {
        selectedStation,
        snapEnabled: isSnapEnabled(),
        setDragging: (d) => (dragging = d),
        drawSettings,
      });
    }
  };

  paper.view.onMouseUp = (event) => {
    const currentToolMode = getToolMode();
    if (
      [ToolMode.SELECT, ToolMode.MAJOR_STATION, ToolMode.NEW_TRACK].includes(
        currentToolMode
      )
    ) {
      handleMouseUpInSelectMode(event, app, {
        dragging,
        setDragging: (d) => (dragging = d),
        drawSettings,
      });
    }
  };

  // Set current map in interaction module
  metroflow.interaction.setCurrentMap(app.map);

  // Initial view update
  paper.view.update();
});

// Add text positioning functions
function calculateTextPositions(text, station) {
  const r = station.style.stationRadius + station.style.strokeWidth;
  const w = text.bounds.width;
  const h = text.bounds.height;
  const padding = 4; // Add padding between station and text

  // Calculate more positions with different offsets and angles
  return [
    // Right side positions
    new paper.Point(r + padding, 0), // Right center
    new paper.Point(r + padding, -h / 2), // Right top
    new paper.Point(r + padding, h / 2), // Right bottom

    // Left side positions
    new paper.Point(-r - w - padding, 0), // Left center
    new paper.Point(-r - w - padding, -h / 2), // Left top
    new paper.Point(-r - w - padding, h / 2), // Left bottom

    // Top positions
    new paper.Point(-w / 2, -r - h - padding), // Top center
    new paper.Point(0, -r - h - padding), // Top center-right
    new paper.Point(-w, -r - h - padding), // Top center-left

    // Bottom positions
    new paper.Point(-w / 2, r + padding), // Bottom center
    new paper.Point(0, r + padding), // Bottom center-right
    new paper.Point(-w, r + padding), // Bottom center-left

    // Diagonal positions
    new paper.Point(r * 0.7 + padding, -r * 0.7 - h), // Top right diagonal
    new paper.Point(-r * 0.7 - w - padding, -r * 0.7 - h), // Top left diagonal
    new paper.Point(r * 0.7 + padding, r * 0.7), // Bottom right diagonal
    new paper.Point(-r * 0.7 - w - padding, r * 0.7), // Bottom left diagonal
  ];
}

function optimizeTextPosition(text, station, paths) {
  const positions = calculateTextPositions(text, station);
  let bestPosition = positions[0];
  let minScore = Number.MAX_VALUE;

  // Get connected segments for this station
  const connectedPaths = paths.filter((path) => {
    const start = path.firstSegment.point;
    const end = path.lastSegment.point;
    const stationPos = station.position;
    const threshold = station.style.stationRadius * 2;
    return (
      start.getDistance(stationPos) < threshold ||
      end.getDistance(stationPos) < threshold
    );
  });

  positions.forEach((position) => {
    text.position = station.position.add(position);

    // Calculate score based on multiple factors
    let score = 0;

    // Factor 1: Path intersections (highest weight)
    const intersections = paths.filter((path) => text.intersects(path)).length;
    score += intersections * 1000;

    // Factor 2: Distance from connected paths (medium weight)
    connectedPaths.forEach((path) => {
      const nearestPoint = path.getNearestPoint(text.position);
      const distance = text.position.getDistance(nearestPoint);
      score += Math.max(0, 50 - distance) * 10;
    });

    // Factor 3: Prefer positions based on connected paths direction
    connectedPaths.forEach((path) => {
      const tangent = path.getTangentAt(0);
      const textVector = position.normalize();
      const alignment = Math.abs(tangent.dot(textVector));
      score += alignment * 5;
    });

    // Factor 4: Distance from station (small weight)
    const distanceFromStation = position.length;
    score += distanceFromStation * 0.1;

    // Factor 5: Prefer right side slightly (smallest weight)
    if (position.x < 0) score += 1;

    if (score < minScore) {
      minScore = score;
      bestPosition = position;
    }
  });

  // Apply the best position
  text.position = station.position.add(bestPosition);
  station.textPositionRel = bestPosition;
}

function adjustMinorStationText(text, direction) {
  // Rotate text to match the direction of the minor station line
  const angle = Math.atan2(direction.y, direction.x);
  text.rotate((angle * 180) / Math.PI);

  // Adjust text position based on its rotation
  const textWidth = text.bounds.width;
  const offset = direction.multiply(textWidth / 2);
  text.position = text.position.add(offset);

  // Ensure text is always readable from left to right
  if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
    text.rotate(180);
  }
}
