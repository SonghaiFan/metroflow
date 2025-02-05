import $ from "jquery";

// Initialize toolbar buttons
$(() => {
  const buttonMajorStation = $("#button-major-station");
  const buttonMinorStation = $("#button-minor-station");
  const buttonSelect = $("#button-select");

  buttonMajorStation.on("click", () => {
    console.log("major button");
  });

  buttonMinorStation.on("click", () => {
    console.log("minor button");
  });
});

export function setMajorStationButtonAction(callback) {
  $("#button-major-station").on("click", callback);
}

export function setMinorStationButtonAction(callback) {
  $("#button-minor-station").on("click", callback);
}

export function setSelectButtonAction(callback) {
  $("#button-select").on("click", callback);
}

export function setNewTrackButtonAction(callback) {
  $("#button-new-track").on("click", callback);
}

export function setNewConnectionAction(callback) {
  $("#button-new-connection").on("click", callback);
}

export function setUndoAction(callback) {
  $("#button-undo").on("click", callback);
}

export function setRedoAction(callback) {
  $("#button-redo").on("click", callback);
}

export function setCalcTextPositionsAction(callback) {
  $("#button-calc-text-positions").on("click", callback);
}

export function setToggleSnapAction(callback) {
  $("#checkbox-snap").on("click", callback);
}

export function setSaveMapAction(callback) {
  $("#button-save-map").on("click", callback);
}

export function setLoadMapAction(callback) {
  document
    .getElementById("file-input")
    .addEventListener("change", callback, false);
}

module.exports = {
  setMajorStationButtonAction: setMajorStationButtonAction,
  setMinorStationButtonAction: setMinorStationButtonAction,
  setSelectButtonAction: setSelectButtonAction,
  setNewTrackButtonAction: setNewTrackButtonAction,
  setNewConnectionAction: setNewConnectionAction,
  setUndoAction: setUndoAction,
  setRedoAction: setRedoAction,
  setToggleSnapAction: setToggleSnapAction,
  setCalcTextPositionsAction: setCalcTextPositionsAction,
  setSaveMapAction: setSaveMapAction,
  setLoadMapAction: setLoadMapAction,
};
