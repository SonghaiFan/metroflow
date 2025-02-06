import paper from "paper";
import { zoomUtils } from "../utils/zoom";
import { createRevision } from "../utils/revision";
import { setLastStation } from "./ui";

export function handleSelectToolClick(
  event,
  app,
  { selectedStation, setSelectedStation }
) {
  // Don't handle selection if we're panning
  if (zoomUtils.isPanningActive()) return;

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

export function handleStationCreation(
  event,
  app,
  {
    currentTrack,
    snapEnabled,
    lastStation,
    selectedStation,
    setSelectedStation,
    drawSettings,
  }
) {
  // Don't create stations if we're panning
  if (zoomUtils.isPanningActive() || !currentTrack) return;

  let point = paper.view.viewToProject(new paper.Point(event.point));
  const station = currentTrack.handleStationCreation(point, snapEnabled);

  if (station) {
    // Apply snapping if enabled
    if (snapEnabled && station.doSnap) {
      const snappedPosition = app.snap.SnapManager.snapPosition(
        currentTrack,
        station,
        point
      );
      station.setPosition(snappedPosition);
    }

    // Create segment between last station and new station
    if (lastStation) {
      currentTrack.createSegment(lastStation, station);
    }

    setLastStation(station);
    setSelectedStation(station);
    station.select();

    // Draw the entire map
    app.map.draw(drawSettings);
    createRevision(app.map);
    paper.view.update();
  }
}

export function handleMinorStationCreation(event, app, { drawSettings }) {
  // Don't create minor stations if we're panning
  if (zoomUtils.isPanningActive()) return;

  const hitResult = paper.project.hitTest(event.point, {
    stroke: true,
    tolerance: 5,
  });

  if (hitResult) {
    const path = hitResult.item;
    const { segment, track } = app.map.findSegmentByPathId(path.id);
    if (segment) {
      const station = track.handleMinorStationCreation(event.point, segment);
      if (station) {
        createRevision(app.map);
        app.map.draw(drawSettings);
        paper.view.update();
      }
    }
  }
}

export function handleDragInSelectMode(
  event,
  app,
  { selectedStation, snapEnabled, setDragging, drawSettings }
) {
  // Don't handle dragging if we're panning
  if (zoomUtils.isPanningActive()) return;

  if (!selectedStation) return;

  setDragging(true);
  let point = event.point;

  // Apply snapping if enabled for this station
  if (selectedStation.doSnap && snapEnabled) {
    const track = app.map.tracks.find((t) =>
      t.stations.includes(selectedStation)
    );
    if (track) {
      point = app.snap.SnapManager.snapPosition(track, selectedStation, point);
    }
  }

  selectedStation.setPosition(point);
  selectedStation.textPositionRel = null; // Reset text position when station is moved

  // Use fast drawing during drag
  app.map.draw({ ...drawSettings, fast: true });
  paper.view.update();
}

export function handleMouseUpInSelectMode(
  event,
  app,
  { dragging, setDragging, drawSettings }
) {
  if (dragging) {
    setDragging(false);
    // Create revision after drag ends
    createRevision(app.map);
    app.map.draw(drawSettings); // Full redraw with labels after drag
    paper.view.update();
  }
}
