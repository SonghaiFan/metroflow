import paper from "paper";
import { DisplaySettings, Observer } from "./util";

let currentMap = null;

export function setCurrentMap(map) {
  currentMap = map;
}

// Mouse event handlers
export function handleMouseDown(event) {
  if (!currentMap) return;

  // Get clicked elements
  const hitResult = paper.project.hitTest(event.point, {
    segments: true,
    stroke: true,
    fill: true,
    tolerance: 5,
  });

  if (hitResult) {
    const path = hitResult.item;

    // Find corresponding station or segment
    const { station, track } = currentMap.findStationByPathId(path.id);
    if (station) {
      // Handle station click
      station.toggleSelect();
      // Only show context menu in select mode
      if (station.isSelected && window.currentToolMode === "select") {
        showStationContextMenu(station.id);
      }
      paper.view.update();
      return;
    }

    const { segment } = currentMap.findSegmentByPathId(path.id);
    if (segment) {
      // Handle segment click
      segment.toggleSelect();
      // Only show context menu in select mode
      if (segment.isSelected && window.currentToolMode === "select") {
        showSegmentContextMenu(segment.id, event.point);
      }
      paper.view.update();
      return;
    }
  }
}

export function handleMouseDrag(event) {
  if (!currentMap) return;

  // Get dragged elements
  const hitResult = paper.project.hitTest(event.point, {
    segments: true,
    stroke: true,
    fill: true,
    tolerance: 5,
  });

  if (hitResult) {
    const path = hitResult.item;
    const { station } = currentMap.findStationByPathId(path.id);
    if (station && station.isSelected) {
      // Move selected station
      station.position = event.point;
      paper.view.update();
    }
  }
}

export function handleMouseUp(event) {
  if (!currentMap) return;

  // Deselect all elements when clicking empty space
  const hitResult = paper.project.hitTest(event.point, {
    segments: true,
    stroke: true,
    fill: true,
    tolerance: 5,
  });

  if (!hitResult) {
    currentMap.tracks.forEach((track) => {
      track.stations.forEach((station) => station.deselect());
      track.segments.forEach((segment) => segment.deselect());
    });
    paper.view.update();
  }
}

export function showStationContextMenu(stationId) {
  $(`#${stationId}`).contextMenu();
}

export function showStationInfo(station) {
  const $div = $(`<div class="station-info">id:${station.id}</div>`);
  $div.css("top", $(`#${station.id}`).css("top"));
  $div.css("left", $(`#${station.id}`).css("left"));
  $("#overlay-content").append($div);
}

export function hideStationInfoAll() {
  $(".station-info").hide();
}

export function showSegmentContextMenu(segmentId, position) {
  $(`#segment-${segmentId}`).data("position", position).contextMenu();
}

export function createStationMinorElement(station, track) {
  $("#overlay").append(
    `<div class="station" id="${station.id}" data-station-id="${station.id}"></div>`
  );
}

export function createMapElements(map, onRemoveStation) {
  $("#overlay").empty();
  return map.tracks.map((track) => {
    const trackElements = createTrackElements(track, onRemoveStation);
    return {
      track,
      stationElements: trackElements.stationElements,
      segmentElements: trackElements.segmentElements,
    };
  });
}

export function createTrackElements(track) {
  const stationElements = track.stations.map((station) =>
    createStationElement(station, track)
  );
  const segmentElements = createSegmentElements(track);

  return { stationElements, segmentElements };
}

export function createStationElement(station, track) {
  $("#overlay").append(
    `<div class="station" id="${station.id}" data-station-id="${station.id}"></div>`
  );
  const stationElement = $(`#${station.id}`);

  function updateElementPosition(stationElement, station) {
    const viewPosition = paper.view.projectToView(station.position);
    stationElement.css({
      top: `${viewPosition.y - stationElement.width() / 2}px`,
      left: `${viewPosition.x - stationElement.height() / 2}px`,
    });
  }

  function updateStyle() {
    stationElement.css("border-width", DisplaySettings.isDebug ? "1px" : "0px");
  }

  function createStationObserver() {
    const stationObserver = new Observer(
      function (station) {
        updateElementPosition(this.stationElement, station);
      },
      function (station) {
        this.stationElement.remove();
      }
    );
    stationObserver.stationElement = stationElement;
    station.registerObserver(stationObserver);
  }

  updateElementPosition(stationElement, station);
  updateStyle();
  createStationObserver();

  return stationElement;
}

export function createSegmentElements(track) {
  console.log("createSegmentElements");
  $(".segment").empty();
  return track.segments.map((segment) => createSegmentElement(segment, track));
}

export function createSegmentElement(segment, track) {
  const segmentElementId = `segment-${segment.id}`;
  $("#overlay").append(
    `<div class="segment" id="${segmentElementId}" data-segment-id="${segment.id}"></div>`
  );
  const segmentElement = $(`#${segmentElementId}`);

  function updateSegmentElementPosition(segmentElement, segment) {
    const segmentCenterView = paper.view.projectToView(segment.center());
    segmentElement.css({
      top: `${segmentCenterView.y - segmentElement.width() / 2}px`,
      left: `${segmentCenterView.x - segmentElement.height() / 2}px`,
    });
  }

  function updateStyle() {
    segmentElement.css("border-width", DisplaySettings.isDebug ? "1px" : "0px");
  }

  function createSegmentObserver() {
    const segmentObserver = new Observer(
      function (segment) {
        updateSegmentElementPosition(this.segmentElement, segment);
      },
      function (segment) {
        this.segmentElement.remove();
      }
    );
    segmentObserver.segmentElement = segmentElement;
    segment.registerObserver(segmentObserver);
  }

  updateSegmentElementPosition(segmentElement, segment);
  updateStyle();
  createSegmentObserver();

  return segmentElement;
}
