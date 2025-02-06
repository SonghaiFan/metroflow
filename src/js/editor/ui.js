import paper from "paper";
import { zoom, zoomUtils } from "../utils/zoom";
import { ToolMode } from "./constants";
import { DisplaySettings } from "../utils/util";
import { hasUndo, hasRedo, undo, redo } from "../utils/revision";
import * as metroflow from "../metroflow";

let currentToolMode = ToolMode.SELECT;
let snapEnabled = true;
let currentTrack = null;
let lastStation = null;
let drawSettings = null;
let hoveredElement = null;

// Add connection mode to ToolMode
export const ConnectionMode = {
  NONE: "none",
  SELECTING_FIRST: "selecting_first",
  SELECTING_SECOND: "selecting_second",
};

let connectionMode = ConnectionMode.NONE;
let firstStation = null;

// Add hover effect handler
function handleMouseMove(event, app) {
  if (zoomUtils.isPanningActive()) return;

  const hitResult = paper.project.hitTest(event.point, {
    segments: true,
    stroke: true,
    fill: true,
    tolerance: 5,
  });

  // Reset previous hover state
  if (hoveredElement) {
    if (hoveredElement.path) {
      hoveredElement.path.strokeColor = hoveredElement.originalStrokeColor;
      hoveredElement.path.fillColor = hoveredElement.originalFillColor;
    }
    hoveredElement = null;
  }

  if (hitResult) {
    const path = hitResult.item;
    const { station } = app.map.findStationByPathId(path.id);
    const { segment } = app.map.findSegmentByPathId(path.id);

    if (station) {
      hoveredElement = {
        path: path,
        originalStrokeColor: path.strokeColor,
        originalFillColor: path.fillColor,
      };
      path.strokeColor = "#FFD700"; // Yellow hover color
      if (path.fillColor) {
        path.fillColor = "#FFFACD"; // Light yellow color
      }
    } else if (segment) {
      hoveredElement = {
        path: path,
        originalStrokeColor: path.strokeColor,
      };
      path.strokeColor = "#FFD700"; // Yellow hover color
    }
  }

  paper.view.update();
}

// Add hover state tracking
export function setToolMode(mode, app) {
  currentToolMode = mode;
  window.currentToolMode = mode;

  // Update button states
  $(".toolbar button").removeClass("active");
  switch (mode) {
    case ToolMode.SELECT:
      $("#button-select").addClass("active");
      currentTrack = null;
      lastStation = null;
      break;
    case ToolMode.MAJOR_STATION:
      $("#button-major-station").addClass("active");
      currentTrack = app.track();
      app.map.addTrack(currentTrack);
      lastStation = null;
      break;
    case ToolMode.MINOR_STATION:
      $("#button-minor-station").addClass("active");
      break;
  }
  console.log(`${mode} tool activated`);
}

export function toggleSnap() {
  snapEnabled = !snapEnabled;
  $("#button-snap").toggleClass("active", snapEnabled);
  console.log("Snap toggled:", snapEnabled);
}

function handleKeyboardShortcuts(event) {
  // Don't handle shortcuts if user is typing in an input
  if (event.target.tagName === "INPUT") return;

  switch (event.key.toLowerCase()) {
    case "s":
      setToolMode(ToolMode.SELECT);
      break;
    case "m":
      setToolMode(ToolMode.MAJOR_STATION);
      break;
    case "n":
      setToolMode(ToolMode.MINOR_STATION);
      break;
    case "t":
      setToolMode(ToolMode.NEW_TRACK);
      break;
    case "g":
      toggleSnap();
      break;
  }
}

export function initializeToolbar(app) {
  // Add mouse move handler for hover effects
  paper.view.onMouseMove = (event) => handleMouseMove(event, app);

  // Drawing tool buttons (radio behavior)
  const drawingTools = [
    "#button-select",
    "#button-major-station",
    "#button-minor-station",
  ];

  drawingTools.forEach((buttonId) => {
    $(buttonId).on("click", () => {
      // Remove active class from all drawing tools
      drawingTools.forEach((id) => $(id).removeClass("active"));
      // Add active class to clicked button
      $(buttonId).addClass("active");

      // Set tool mode based on clicked button
      switch (buttonId) {
        case "#button-select":
          setToolMode(ToolMode.SELECT, app);
          break;
        case "#button-major-station":
          setToolMode(ToolMode.MAJOR_STATION, app);
          break;
        case "#button-minor-station":
          setToolMode(ToolMode.MINOR_STATION, app);
          break;
      }
    });
  });

  // Independent new track button
  $("#button-new-track").on("click", () => {
    currentTrack = app.track();
    app.map.addTrack(currentTrack);
    lastStation = null;
  });

  // Other button handlers...
  $("#button-snap").on("click", toggleSnap);

  // Connection button handler
  $("#button-new-connection").on("click", () => {
    if (connectionMode === ConnectionMode.NONE) {
      connectionMode = ConnectionMode.SELECTING_FIRST;
      $("#button-new-connection").addClass("active");
      setToolMode(ToolMode.SELECT, app);
    } else {
      connectionMode = ConnectionMode.NONE;
      firstStation = null;
      $("#button-new-connection").removeClass("active");
    }
  });

  $("#button-calc-text-positions").on("click", () => {
    drawSettings.calcTextPositions = true;
    // Reset all stored text positions
    app.map.tracks.forEach((track) => {
      track.stations.forEach((station) => {
        station.textPositionRel = null;
      });
    });
    app.map.draw(drawSettings);
    drawSettings.calcTextPositions = false;
    console.log("Text positions recalculated");
  });

  // Save map functionality
  $("#button-save-map").on("click", () => {
    const mapData = metroflow.serialize.saveMap(app.map);
    const blob = new Blob([mapData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create temporary link and trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = "metroflow-map.json";
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Load map functionality
  $("#file-input").change((e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        paper.project.clear();
        const newMap = metroflow.serialize.loadMap(event.target.result);
        app.map = newMap;
        metroflow.interaction.setCurrentMap(newMap);
        newMap.draw(drawSettings);
        metroflow.interaction.createMapElements(newMap);
        paper.view.update();
      } catch (error) {
        console.error("Error loading map:", error);
      }
    };
    reader.readAsText(file);
  });

  $("#button-save-map").on("contextmenu", (e) => {
    e.preventDefault();
    $("#file-input").click();
  });

  $("#button-undo").on("click", () => {
    if (!hasUndo()) {
      console.log("No undo available");
      return;
    }
    const newMap = undo(app.map);
    app.map = newMap;
    metroflow.interaction.setCurrentMap(newMap);
    app.map.draw(drawSettings);
    paper.view.update();
  });

  $("#button-redo").on("click", () => {
    if (!hasRedo()) {
      console.log("No redo available");
      return;
    }
    const newMap = redo(app.map);
    app.map = newMap;
    metroflow.interaction.setCurrentMap(newMap);
    app.map.draw(drawSettings);
    paper.view.update();
  });

  // Initialize keyboard shortcuts
  $(document).on("keydown", handleKeyboardShortcuts);
}

export function initializeSidebar(app) {
  // Example maps
  $("#button-example-map1, #button-example-map2").on("click", async (e) => {
    const filename = $(e.target).data("filename");
    console.log("Loading example map:", filename);

    try {
      const response = await fetch(`/src/maps/${filename}`);
      const mapData = await response.json();

      paper.project.clear();
      const newMap = metroflow.serialize.loadMap(mapData);
      app.map = newMap;
      metroflow.interaction.setCurrentMap(newMap);
      newMap.draw(drawSettings);
      metroflow.interaction.createMapElements(newMap);
      paper.view.update();
    } catch (error) {
      console.error("Error loading example map:", error);
      console.error(error.stack);
    }
  });

  // Map style controls
  $("#checkbox-station-names").on("change", (e) => {
    drawSettings.text = e.target.checked;
    app.map.draw(drawSettings);
    console.log("Station names toggled:", e.target.checked);
  });

  $("#checkbox-minor-station-names").on("change", (e) => {
    drawSettings.minorStationText = e.target.checked;
    app.map.draw(drawSettings);
    console.log("Minor station names toggled:", e.target.checked);
  });

  $("#checkbox-debug").on("change", (e) => {
    DisplaySettings.isDebug = e.target.checked;
    console.log("Debug mode toggled:", e.target.checked);
  });

  $("#track-color-picker").on("change", (e) => {
    const value = e.target.value;
    app.map.tracks.forEach((track) => {
      track.segmentStyle.strokeColor = value;
      track.stationMinorStyle.strokeColor = value;
    });
    app.map.draw(drawSettings);
    paper.view.update();
  });

  // Initialize range inputs
  $("#track-width-slider").on("input", (e) => {
    const value = parseInt(e.target.value);
    app.map.tracks.forEach((track) => {
      track.segmentStyle.strokeWidth = value;
      track.stationMinorStyle.strokeWidth = value;
      track.stationMinorStyle.minorStationSize = value * 2.0;
    });
    app.map.draw(drawSettings);
    paper.view.update();
  });

  $("#station-radius-slider").on("input", (e) => {
    const value = parseInt(e.target.value);
    app.map.tracks.forEach((track) => {
      track.stationStyle.stationRadius = value;
    });
    app.map.draw(drawSettings);
    paper.view.update();
  });

  $("#station-stroke-width-slider").on("input", (e) => {
    const value = parseInt(e.target.value);
    app.map.tracks.forEach((track) => {
      track.stationStyle.strokeWidth = value;
    });
    app.map.draw(drawSettings);
    paper.view.update();
  });

  $("#station-stroke-color-picker").on("change", (e) => {
    const value = e.target.value;
    app.map.tracks.forEach((track) => {
      track.stationStyle.strokeColor = value;
    });
    app.map.draw(drawSettings);
    paper.view.update();
  });

  $("#station-name-size-slider").on("input", (e) => {
    const value = parseInt(e.target.value);
    drawSettings.fontSize = value;
    drawSettings.minorFontSize = Math.max(8, value - 4);
    app.map.draw(drawSettings);
    paper.view.update();
  });

  // Initialize track table update interval
  setInterval(() => updateTrackTable(app), 1000);
}

function updateTrackTable(app) {
  const $list = $("#station-list");
  $list.empty();

  app.map.tracks.forEach((track) => {
    track.stations.forEach((station) => {
      const isMinor = station.constructor.name === "StationMinor";
      const $item = $("<div>")
        .addClass("station-item")
        .toggleClass("minor-station", isMinor);

      // Add station type icon
      const $type = $("<div>").addClass("station-type");
      if (isMinor) {
        $type.html(`
          <svg viewBox="0 0 24 24" width="16" height="16">
            <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        `);
      } else {
        $type.html(`
          <svg viewBox="0 0 24 24" width="16" height="16">
            <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
        `);
      }

      // Add name input
      const $input = $("<input>")
        .attr("type", "text")
        .attr("placeholder", isMinor ? "Minor Station" : "Station Name")
        .val(station.name || "")
        .on("change", (e) => {
          station.name = e.target.value;
          paper.view.update();
        });

      $item.append($type, $input);
      $list.append($item);
    });
  });
}

export function initializeZoomControls() {
  $("#button-zoom-in").on("click", () => zoom.zoom(1));
  $("#button-zoom-out").on("click", () => zoom.zoom(-1));
  $("#button-zoom-reset").on("click", () => zoom.resetZoom());
}

// Export state getters and setters
export function getToolMode() {
  return currentToolMode;
}

export function isSnapEnabled() {
  return snapEnabled;
}

export function getCurrentTrack() {
  return currentTrack;
}

export function getLastStation() {
  return lastStation;
}

export function setLastStation(station) {
  lastStation = station;
  console.log("Last station set:", station);
}

export function setDrawSettings(settings) {
  drawSettings = settings;
}

// Handle station selection and connections
function handleSelectToolClick(
  event,
  app,
  { selectedStation, setSelectedStation }
) {
  if (zoomUtils.isPanningActive()) return;

  const hitResult = paper.project.hitTest(event.point, {
    segments: true,
    stroke: true,
    fill: true,
    tolerance: 5,
  });

  // Reset hover state when clicking
  if (hoveredElement) {
    if (hoveredElement.path) {
      hoveredElement.path.strokeColor = hoveredElement.originalStrokeColor;
      hoveredElement.path.fillColor = hoveredElement.originalFillColor;
    }
    hoveredElement = null;
  }

  if (hitResult) {
    const path = hitResult.item;
    const { station } = app.map.findStationByPathId(path.id);
    if (station) {
      // Handle connection mode
      if (connectionMode === ConnectionMode.SELECTING_FIRST) {
        firstStation = station;
        connectionMode = ConnectionMode.SELECTING_SECOND;
        path.strokeColor = "#FFD700"; // Yellow highlight for first selected station
        return;
      } else if (
        connectionMode === ConnectionMode.SELECTING_SECOND &&
        firstStation
      ) {
        const connection = app.map.createConnection(firstStation, station);
        if (connection) {
          app.map.draw(drawSettings);
          paper.view.update();
        }
        connectionMode = ConnectionMode.NONE;
        firstStation = null;
        $("#button-new-connection").removeClass("active");
        return;
      }

      // Normal selection behavior
      setSelectedStation(station);
      station.toggleSelect();
      paper.view.update();
    }
  } else {
    // Deselect all when clicking empty space
    setSelectedStation(null);
    app.map.tracks.forEach((track) => track.deselectAllStations());
    paper.view.update();
  }
}
