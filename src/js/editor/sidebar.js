import paper from "paper";
import $ from "jquery";
import { Observer } from "../util";
import "../metroflow";

let currentTrack = null;
let signalTrackInfoChanged = null;

export function setCurrentTrack(track) {
  if (currentTrack && currentTrack.id === track.id) {
    return;
  }
  const colorPicker = document.getElementById("track-color-picker");
  colorPicker.value = track.segmentStyle.strokeColor;
  document.getElementById("station-stroke-color-picker").value =
    track.stationStyle.strokeColor;

  $("#track-width-slider").slider("value", track.segmentStyle.strokeWidth);
  $("#station-radius-slider").slider("value", track.stationStyle.stationRadius);
  $("#station-stroke-width-slider").slider(
    "value",
    track.stationStyle.strokeWidth
  );

  currentTrack = track;
  updateTableTrack(track);
}

export function setExampleMapAction(callback) {
  $("#button-example-map1, #button-example-map2").on("click", function () {
    const filename = $(this).data("filename");
    console.log(filename);
    callback(filename);
  });
}

export function setTrackColorChangeAction(callback) {
  const colorPicker = document.getElementById("track-color-picker");
  const watchColorPicker = (event) => callback(event.target.value);

  colorPicker.addEventListener("input", watchColorPicker, false);
  colorPicker.addEventListener("change", watchColorPicker, false);
}

export function setTrackWidthSliderChangeAction(callback) {
  $("#track-width-slider").slider({
    slide: (event, ui) => callback(ui.value),
    change: (event, ui) => callback(ui.value),
    min: 0,
    max: 20,
    step: 0.5,
  });
}

export function setStationRadiusSliderChangeAction(callback) {
  $("#station-radius-slider").slider({
    slide: (event, ui) => callback(ui.value),
    change: (event, ui) => callback(ui.value),
    min: 0,
    max: 20,
    step: 0.5,
  });
}

export function setStationStrokeWidthSliderChangeAction(callback) {
  $("#station-stroke-width-slider").slider({
    slide: (event, ui) => callback(ui.value),
    change: (event, ui) => callback(ui.value),
    min: 0,
    max: 20,
    step: 0.5,
  });
}

export function setStationStrokeColorChangeAction(callback) {
  const colorPicker = document.getElementById("station-stroke-color-picker");
  const watchColorPicker = (event) => callback(event.target.value);

  colorPicker.addEventListener("input", watchColorPicker, false);
  colorPicker.addEventListener("change", watchColorPicker, false);
}

export function showTracks(tracks) {
  // Placeholder for future implementation
}

function updateTableTrack(track) {
  console.log("TrackObserver.trackChanged()");
  if (!currentTrack || currentTrack.id !== track.id) {
    return;
  }

  $("#track-table tbody").empty();
  track.stations.forEach((station) => addStationRow(station));

  function addStationRow(station) {
    const markup = `
            <tr>
                <td>
                    <input 
                        id="station-row-${station.id}" 
                        type="text" 
                        name="station" 
                        value="${station.name}" 
                        data-stationid="${station.id}"
                    >
                </td>
            </tr>`;

    $("#track-table tbody").append(markup);
    $(`#station-row-${station.id}`).on("change", stationNameInputChange);
  }

  function stationNameInputChange() {
    console.log("stationNameInputChange");
    const stationId = $(this).data("stationid");
    console.log("stationid", stationId);
    const station = track.findStation(stationId);
    console.log("station", station);
    console.log("value", $(this).val());
    station.name = $(this).val();
    signalTrackInfoChanged(currentTrack);
  }
}

export function notifyTrackChanged(track) {
  const trackObserver = new Observer(
    updateTableTrack,
    () => {} // Empty cleanup function
  );
  track.registerObserver(trackObserver);
}

export function setTrackChangeAction(callback) {
  signalTrackInfoChanged = callback;
}

export function setToggleDebugAction(callback) {
  $("#checkbox-debug").on("click", callback);
}

export function setToggleMinorNamesAction(callback) {
  $("#checkbox-minor-station-names").on("click", callback);
}
