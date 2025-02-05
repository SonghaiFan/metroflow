import paper from "paper";
import $ from "jquery";
import * as MetroFlow from "../metroflow";
import * as sidebar from "./sidebar";
import * as toolbar from "./toolbar";
import * as contextmenu from "./contextmenu";

// Constants
const MODES = {
  MAJOR_STATION: "majorstation",
  MINOR_STATION: "minorstation",
  SELECT: "select",
  CREATE_CONNECTION: "createConnection",
};

const HIT_OPTIONS = {
  segments: true,
  stroke: true,
  fill: true,
  tolerance: 3,
};

// State
let map = null;
let currentTrack = null;
let segmentClicked = null;
let selectedStation = null;
let connectionStationA = null;
let connectionStationB = null;
let drawSettings = null;
let drawSettingsDrag = null;
let drawSettingsFull = null;
let dragging = false;
let doSnap = true;
let mode = MODES.MAJOR_STATION;

// Initialize on document ready
$(initialise);

// Disable browser context menu
$("body").on("contextmenu", "#paperCanvas", (e) => false);

function resetState() {
  map = null;
  currentTrack = null;
  segmentClicked = null;
  selectedStation = null;
  connectionStationA = null;
  connectionStationB = null;
  dragging = false;
}

function initialise() {
  drawSettings = MetroFlow.map.createDrawSettings();
  drawSettings.minorStationText = true;

  drawSettingsDrag = MetroFlow.map.createDrawSettings();
  drawSettingsDrag.text = false;
  drawSettingsDrag.fast = true;

  drawSettingsFull = MetroFlow.map.createDrawSettings();
  drawSettingsFull.text = true;
  drawSettingsFull.fast = false;
  drawSettingsFull.calcTextPositions = true;
  drawSettingsFull.minorStationText = true;

  initialiseToolbarActions();
  const newMap = MetroFlow.map.createMap();
  setNewMap(newMap);
  setCurrentTrack(createTrack());
}

function setNewMap(newMap) {
  map = newMap;
  MetroFlow.interaction.setCurrentMap(newMap);
}

function onRemoveStation(stationId) {
  selectedStation = null;
  map.removeStation(stationId);
  map.draw(drawSettings);
}

function createTrack() {
  const track = map.createTrack();
  sidebar.notifyTrackChanged(track);
  return track;
}

function setCurrentTrack(track) {
  if (!track || (currentTrack && currentTrack.id === track.id)) {
    return;
  }
  if (selectedStation) {
    selectedStation.deselect();
  }
  currentTrack = track;
  sidebar.setCurrentTrack(track);
}

function getStationClicked(hitResult, allowSwitchTrack) {
  const path = hitResult.item;
  const result = map.findStationByPathId(path.id);
  const stationClicked = result.station;
  if (allowSwitchTrack) {
    setCurrentTrack(result.track);
  }
  return stationClicked;
}

function getSegmentClicked(hitResult) {
  const path = hitResult.item;
  const { segments } = path;
  if (!segments) {
    return null;
  }
  const result = map.findSegmentByPathId(segments[0].path.id);
  const segmentClicked = result.segment;
  setCurrentTrack(result.track);
  return segmentClicked;
}

function onRightClick(event) {
  const hitResult = paper.project.hitTest(event.point, HIT_OPTIONS);
  if (!hitResult) {
    return;
  }

  const stationClicked = getStationClicked(hitResult);
  if (stationClicked) {
    MetroFlow.interaction.showStationContextMenu(stationClicked.id);
    return;
  }

  const segmentClicked = getSegmentClicked(hitResult);
  if (segmentClicked) {
    MetroFlow.interaction.showSegmentContextMenu(segmentClicked.id);
  }
}

function selectStation(stationClicked) {
  if (selectedStation && stationClicked.id !== selectedStation.id) {
    selectedStation.deselect();
  }
  stationClicked.toggleSelect();
  selectedStation = stationClicked;
  map.draw(drawSettings);
}

function onClickMajorStationMode(event) {
  console.log("onClickMajorStation");
  const hitResult = paper.project.hitTest(event.point, HIT_OPTIONS);

  if (hitResult) {
    const stationClicked = getStationClicked(hitResult, false);
    if (stationClicked && selectedStation) {
      console.log("station clicked");
      if (stationClicked.id !== selectedStation.id) {
        currentTrack.createSegment(stationClicked, selectedStation);
      }
      map.draw(drawSettings);
      MetroFlow.revision.createRevision(map);
      return;
    }

    const segmentClicked = getSegmentClicked(hitResult);
    if (segmentClicked) {
      const offsetFactor =
        segmentClicked.getOffsetOf(event.point) / segmentClicked.length();
      const stationNew = currentTrack.createStationOnSegment(
        segmentClicked,
        offsetFactor
      );
      map.draw(drawSettings);
      MetroFlow.revision.createRevision(map);

      const stationElement = MetroFlow.interaction.createStationElement(
        stationNew,
        currentTrack,
        onRemoveStation
      );
      contextmenu.createStationContextMenu(
        stationElement.attr("id"),
        onRemoveStation
      );
      return;
    }
  } else {
    if (!selectedStation) {
      selectedStation = currentTrack.lastAddedStation();
    }
    const stationNew = currentTrack.createStationFree(
      event.point,
      selectedStation
    );
    if (doSnap) {
      const position = MetroFlow.snap.snapPosition(
        currentTrack,
        stationNew,
        event.point
      );
      stationNew.setPosition(position);
    }
    selectStation(stationNew);

    const stationElement = MetroFlow.interaction.createStationElement(
      stationNew,
      currentTrack,
      onRemoveStation
    );
    contextmenu.createStationContextMenu(
      stationElement.attr("id"),
      onRemoveStation
    );

    const segmentElements =
      MetroFlow.interaction.createSegmentElements(currentTrack);
    segmentElements.forEach((element) => {
      contextmenu.createSegmentContextMenu(
        element.attr("id"),
        createStationMinorOnMap
      );
    });

    MetroFlow.revision.createRevision(map);
  }
}

function createStationMinorOnMap(position, segmentId) {
  const segmentInfo = map.findSegment(segmentId);
  segmentInfo.track.createStationMinorOnSegmentId(position, segmentId);
  map.draw(drawSettings);
  MetroFlow.revision.createRevision(map);
}

function onClickMinorStationMode(event) {
  console.log("onClickMinorStationMode");
  const hitResult = paper.project.hitTest(event.point, HIT_OPTIONS);

  if (hitResult) {
    const path = hitResult.item;
    if (hitResult.type === "stroke" || path) {
      console.log("stroke hit");
      segmentClicked = getSegmentClicked(hitResult);
      if (segmentClicked) {
        createStationMinorOnMap(event.point, segmentClicked.id);
      } else {
        console.log("warning: no segment clicked");
      }
    }
  }
}

function onClickSelectMode(event) {
  const hitResult = paper.project.hitTest(event.point, HIT_OPTIONS);
  if (hitResult) {
    const stationClicked = getStationClicked(hitResult, true);
    if (stationClicked) {
      console.log("selectedStation", selectedStation);
      selectStation(stationClicked);
      return;
    }

    const segmentClicked = getSegmentClicked(hitResult);
    if (segmentClicked) {
      console.log("segment clicked");
    }
  }
}

// Event handlers for mouse interactions
function onMouseDown(event) {
  switch (mode) {
    case MODES.MAJOR_STATION:
      onClickMajorStationMode(event);
      break;
    case MODES.MINOR_STATION:
      onClickMinorStationMode(event);
      break;
    case MODES.SELECT:
      onClickSelectMode(event);
      break;
    case MODES.CREATE_CONNECTION:
      onClickCreateConnectionMode(event);
      break;
  }
}

function onMouseUp(event) {
  if (dragging) {
    dragging = false;
    map.draw(drawSettingsFull);
  }
}

function onMouseDrag(event) {
  if (selectedStation && mode === MODES.SELECT) {
    dragging = true;
    const position = event.point;
    if (doSnap) {
      const snappedPosition = MetroFlow.snap.snapPosition(
        currentTrack,
        selectedStation,
        position
      );
      selectedStation.setPosition(snappedPosition);
    } else {
      selectedStation.setPosition(position);
    }
    map.draw(drawSettingsDrag);
  }
}

// Initialize toolbar actions and bind events
function initialiseToolbarActions() {
  toolbar.initialise({
    onTrackChanged,
    majorStationButtonClicked,
    minorStationButtonClicked,
    selectButtonClicked,
    newTrackButtonClicked,
    newConnectionButtonClicked,
    calcTextPositionButtonClicked,
    snapCheckboxClicked,
    minorNamesCheckboxClicked,
    debugCheckboxClicked,
    saveMapClicked,
    loadMapClicked,
    loadExampleMapClicked,
    onUndoButtonClicked,
    onRedoButtonClicked,
    onTrackColorChanged,
    onTrackWidthChanged,
    onStationRadiusChanged,
    onStationStrokeWidthChanged,
    onStationStrokeColorChanged,
  });

  // Bind paper.js event handlers
  paper.view.onMouseDown = onMouseDown;
  paper.view.onMouseDrag = onMouseDrag;
  paper.view.onMouseUp = onMouseUp;
  paper.view.onRightClick = onRightClick;
}

// Export necessary functions and constants
export {
  MODES,
  HIT_OPTIONS,
  initialise,
  setNewMap,
  onRemoveStation,
  createTrack,
  setCurrentTrack,
  onRightClick,
  onMouseDown,
  onMouseDrag,
  onMouseUp,
};
