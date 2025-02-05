import paper from "paper";
import $ from "jquery";
import * as MetroFlow from "../metroflow";

// State
let isDebug = false;
let map = null;
let currentTrack = null;
let segmentClicked = null;
let selectedStation = null;
let drawSettingsFull = null;
let startPosition = null;

// Initialize on document ready
$(initialise);

function initialise() {
  MetroFlow.util.DisplaySettings.isDebug = isDebug;

  drawSettingsFull = MetroFlow.map.createDrawSettings();
  drawSettingsFull.text = true;
  drawSettingsFull.fast = false;
  drawSettingsFull.calcTextPositions = true;
  drawSettingsFull.minorStationText = true;

  setLoadMapAction(loadMapClicked);
  const newMap = MetroFlow.map.createMap();
  setNewMap(newMap);
  MetroFlow.zoom.enableZoomOnCanvas(newMap);
}

function resetState() {
  map = null;
  currentTrack = null;
  segmentClicked = null;
  selectedStation = null;
}

function setNewMap(newMap) {
  map = newMap;
  MetroFlow.zoom.setNewMap(newMap);
  MetroFlow.interaction.setCurrentMap(newMap);
}

function setLoadMapAction(callback) {
  document
    .getElementById("file-input")
    .addEventListener("change", callback, false);
}

function loadMapClicked(event) {
  console.log("load map button clicked");
  prepareLoadMap();
  readSingleFile(event);
}

function readSingleFile(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const contents = event.target.result;
    loadMapJson(JSON.parse(contents));
  };
  reader.readAsText(file);
}

function prepareLoadMap() {
  paper.project.clear();
  resetState();
}

function finishLoadMap(newMap) {
  newMap.draw(drawSettingsFull);
  const onRemoveStation = null;
  MetroFlow.interaction.createMapElements(newMap, onRemoveStation);
}

function loadMapJson(json) {
  const newMap = MetroFlow.serialize.loadMap(json);
  setNewMap(newMap);
  finishLoadMap(newMap);
}

// Mouse event handlers
function onMouseDown(event) {
  startPosition = event.point;
}

function onMouseUp(event) {
  map.notifyAllStationsAndSegments();
  startPosition = null;
}

function onMouseDrag(event) {
  console.log("panning", event.delta);
  const offset = startPosition.subtract(event.point);
  paper.view.center = paper.view.center.add(offset);
}

// Bind paper.js event handlers
const tool = new paper.Tool();
tool.onMouseDown = onMouseDown;
tool.onMouseUp = onMouseUp;
tool.onMouseDrag = onMouseDrag;

// Export necessary functions
export {
  initialise,
  setNewMap,
  loadMapJson,
  onMouseDown,
  onMouseUp,
  onMouseDrag,
};
