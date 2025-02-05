// Import jQuery and make it global
import jQuery from "jquery";
window.jQuery = jQuery;
window.$ = jQuery;

import paper from "paper";
import * as metroflow from "./metroflow";
import { DisplaySettings } from "./util";
import * as revision from "./revision";

// Import jQuery Context Menu
import "jquery-contextmenu/dist/jquery.contextMenu";
import "jquery-contextmenu/dist/jquery.contextMenu.css";

// Import CSS
import "../css/metroflow-editor.css";

// Example maps will be loaded dynamically
let example1, example2;

// Tool modes
const ToolMode = {
  SELECT: "select",
  MAJOR_STATION: "major_station",
  MINOR_STATION: "minor_station",
  NEW_TRACK: "new_track",
};

let currentToolMode = ToolMode.SELECT;
window.currentToolMode = currentToolMode; // Expose globally

let currentTrack = null;
let lastStation = null;
let snapEnabled = true;
let selectedStation = null;
let dragging = false;

// Create default draw settings
const drawSettings = metroflow.map.createDrawSettings();
drawSettings.text = true;
drawSettings.fast = false;
drawSettings.calcTextPositions = true;
drawSettings.minorStationText = true;
drawSettings.fontSize = 14;
drawSettings.minorFontSize = 10;

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

  // Initialize UI elements
  initializeToolbar(app);
  initializeSidebar(app);
  initializeEventHandlers(app);

  // Set current map in interaction module
  metroflow.interaction.setCurrentMap(app.map);

  // Initial view update
  paper.view.update();
});

function initializeToolbar(app) {
  $("#button-select").on("click", () => {
    currentToolMode = ToolMode.SELECT;
    window.currentToolMode = currentToolMode;
    currentTrack = null;
    lastStation = null;
    console.log("Select tool activated");
  });

  $("#button-major-station").on("click", () => {
    currentToolMode = ToolMode.MAJOR_STATION;
    window.currentToolMode = currentToolMode;
    currentTrack = app.track();
    app.map.addTrack(currentTrack);
    lastStation = null;
    console.log("Major station tool activated");
  });

  $("#button-minor-station").on("click", () => {
    currentToolMode = ToolMode.MINOR_STATION;
    window.currentToolMode = currentToolMode;
    console.log("Minor station tool activated");
  });

  $("#button-new-track").on("click", () => {
    currentToolMode = ToolMode.NEW_TRACK;
    window.currentToolMode = currentToolMode;
    currentTrack = app.track();
    app.map.addTrack(currentTrack);
    lastStation = null;
    console.log("New track tool activated");
  });

  $("#button-new-connection").on("click", () => {
    // Handle new connection
    console.log("New connection tool clicked");
  });

  $("#button-calc-text-positions").on("click", () => {
    // Handle text positioning
    console.log("Calculate text positions clicked");
  });

  $("#checkbox-snap").on("change", (e) => {
    snapEnabled = e.target.checked;
    console.log("Snap toggled:", snapEnabled);
  });

  $("#button-save-map").on("click", () => {
    // Handle map save
    console.log("Save map clicked");
  });

  $("#file-input").change((e) => {
    // Handle map load
    console.log("Load map file selected");
  });

  $("#button-undo").on("click", () => {
    if (!revision.hasUndo()) {
      console.log("No undo available");
      return;
    }
    const newMap = revision.undo(app.map);
    app.map = newMap;
    metroflow.interaction.setCurrentMap(newMap);
    app.map.draw(drawSettings);
    paper.view.update();
  });

  $("#button-redo").on("click", () => {
    if (!revision.hasRedo()) {
      console.log("No redo available");
      return;
    }
    const newMap = revision.redo(app.map);
    app.map = newMap;
    metroflow.interaction.setCurrentMap(newMap);
    app.map.draw(drawSettings);
    paper.view.update();
  });
}

function initializeSidebar(app) {
  // Example maps
  $("#button-example-map1, #button-example-map2").on("click", async (e) => {
    const filename = $(e.target).data("filename");
    console.log("Loading example map:", filename);

    try {
      // Import the JSON file using Vite's dynamic import
      const response = await fetch(`/src/maps/${filename}`);
      const mapData = await response.json();

      // Clear the current project
      paper.project.clear();

      // Load the map
      const newMap = metroflow.serialize.loadMap(mapData);

      // Set the new map
      app.map = newMap;
      metroflow.interaction.setCurrentMap(newMap);

      // Draw the map with full settings
      newMap.draw(drawSettings);

      // Create map elements for interaction
      metroflow.interaction.createMapElements(newMap);

      // Update the view
      paper.view.update();
    } catch (error) {
      console.error("Error loading example map:", error);
      console.error(error.stack);
    }
  });

  // Map style controls
  $("#checkbox-minor-station-names").on("change", (e) => {
    drawSettings.minorStationText = e.target.checked;
    app.map.draw(drawSettings);
    console.log("Minor station names toggled:", e.target.checked);
  });

  $("#checkbox-debug").on("change", (e) => {
    DisplaySettings.isDebug = e.target.checked;
    console.log("Debug mode toggled:", e.target.checked);
  });

  // Track style controls
  $("#track-color-picker").on("change", (e) => {
    // Handle track color change
    console.log("Track color changed:", e.target.value);
  });

  // Initialize range inputs
  $("#track-width-slider").on("input", (e) => {
    const value = e.target.value;
    console.log("Track width changed:", value);
    paper.view.update();
  });

  $("#station-radius-slider").on("input", (e) => {
    const value = e.target.value;
    console.log("Station radius changed:", value);
    paper.view.update();
  });

  $("#station-stroke-width-slider").on("input", (e) => {
    const value = e.target.value;
    console.log("Station stroke width changed:", value);
    paper.view.update();
  });

  $("#station-stroke-color-picker").on("change", (e) => {
    // Handle station stroke color change
    console.log("Station stroke color changed:", e.target.value);
    paper.view.update();
  });
}

function initializeEventHandlers(app) {
  // Initialize Paper.js view event handlers
  paper.view.onMouseDown = (event) => {
    switch (currentToolMode) {
      case ToolMode.SELECT:
        handleSelectToolClick(event, app);
        break;
      case ToolMode.MAJOR_STATION:
      case ToolMode.NEW_TRACK:
        handleStationCreation(event, app);
        break;
      case ToolMode.MINOR_STATION:
        handleMinorStationCreation(event, app);
        break;
    }
  };

  paper.view.onMouseDrag = (event) => {
    // Allow dragging in both select mode and during station creation
    if (
      currentToolMode === ToolMode.SELECT ||
      currentToolMode === ToolMode.MAJOR_STATION ||
      currentToolMode === ToolMode.NEW_TRACK
    ) {
      handleDragInSelectMode(event, app);
    }
  };

  paper.view.onMouseUp = (event) => {
    if (
      currentToolMode === ToolMode.SELECT ||
      currentToolMode === ToolMode.MAJOR_STATION ||
      currentToolMode === ToolMode.NEW_TRACK
    ) {
      handleMouseUpInSelectMode(event, app);
    }
  };

  // Handle window resize
  $(window).resize(() => {
    paper.view.update();
  });

  // Initialize context menus
  $.contextMenu({
    selector: ".station",
    callback: function (key, options) {
      const stationId = $(this).data("station-id");
      const station = app.map.findStation(stationId);
      if (!station) return;

      switch (key) {
        case "delete":
          app.map.removeStation(stationId);
          paper.view.update();
          break;
        case "rename":
          const name = prompt("Enter station name:", station.name || "");
          if (name !== null) {
            station.name = name;
            paper.view.update();
          }
          break;
      }
    },
    items: {
      rename: { name: "Rename" },
      delete: { name: "Delete" },
    },
  });

  $.contextMenu({
    selector: ".segment",
    callback: function (key, options) {
      const segmentId = $(this).data("segment-id");
      const position = $(this).data("position");
      const { segment, track } = app.map.findSegment(segmentId);
      if (!segment) return;

      switch (key) {
        case "addMinorStation":
          track.createStationMinor(position, segment);
          paper.view.update();
          break;
      }
    },
    items: {
      addMinorStation: { name: "Add Minor Station" },
    },
  });

  // Initialize track table
  function updateTrackTable() {
    const $table = $("#track-table tbody");
    $table.empty();

    // Add station rows
    app.map.tracks.forEach((track) => {
      track.stations.forEach((station) => {
        const $row = $("<tr>");
        $row.append(
          $("<td>").append(
            $("<input>")
              .attr("type", "text")
              .val(station.name || "")
              .on("change", (e) => {
                station.name = e.target.value;
                paper.view.update();
              })
          )
        );
        $table.append($row);
      });
    });
  }

  // Update track table when stations change
  setInterval(updateTrackTable, 1000); // Simple polling for now
}

function handleSelectToolClick(event, app) {
  const hitResult = paper.project.hitTest(event.point, {
    segments: true,
    stroke: true,
    fill: true,
    tolerance: 5,
  });

  if (hitResult) {
    const path = hitResult.item;
    const { station } = app.map.findStationByPathId(path.id);
    if (station) {
      selectedStation = station;
      station.toggleSelect();
      paper.view.update();
    }
  } else {
    // Deselect all when clicking empty space
    selectedStation = null;
    app.map.tracks.forEach((track) => {
      track.stations.forEach((station) => station.deselect());
    });
    paper.view.update();
  }
}

function handleStationCreation(event, app) {
  if (!currentTrack) return;

  // Convert event point to project coordinates
  let point = paper.view.viewToProject(new paper.Point(event.point));

  // Create the station
  const station = currentTrack.createStationFree(point, lastStation);
  lastStation = station;
  selectedStation = station;
  station.select();

  // Apply snapping if enabled
  if (snapEnabled) {
    const snappedPosition = metroflow.snap.SnapManager.snapPosition(
      currentTrack,
      station,
      point
    );
    station.setPosition(snappedPosition);
  }

  // Draw the entire map to ensure proper rendering
  app.map.draw(drawSettings);

  // Create revision after station creation
  revision.createRevision(app.map);

  paper.view.update();
}

function handleMinorStationCreation(event, app) {
  const hitResult = paper.project.hitTest(event.point, {
    stroke: true,
    tolerance: 5,
  });

  if (hitResult) {
    const path = hitResult.item;
    const { segment, track } = app.map.findSegmentByPathId(path.id);
    if (segment) {
      const station = track.createStationMinor(event.point, segment);
      station.name = "minor station"; // Set default name for minor stations
      // Create revision after minor station creation
      revision.createRevision(app.map);
      app.map.draw(drawSettings); // Use full draw settings to show labels
      paper.view.update();
    }
  }
}

function handleDragInSelectMode(event, app) {
  if (!selectedStation) return;

  dragging = true;
  let point = event.point;

  // Apply snapping if enabled
  if (snapEnabled) {
    const track = app.map.tracks.find((t) =>
      t.stations.includes(selectedStation)
    );
    if (track) {
      point = metroflow.snap.SnapManager.snapPosition(
        track,
        selectedStation,
        point
      );
    }
  }

  selectedStation.position = point;
  // Use fast drawing during drag but still show labels
  app.map.draw({ ...drawSettings, fast: true });
  paper.view.update();
}

function handleMouseUpInSelectMode(event, app) {
  if (dragging) {
    dragging = false;
    // Create revision after drag ends
    revision.createRevision(app.map);
    app.map.draw(drawSettings); // Full redraw with labels after drag
  }
}
