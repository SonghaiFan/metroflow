import paper from "paper";
import $ from "jquery";

let currentMap = null;

export function setNewMap(newMap) {
  currentMap = newMap;
}

export function enableZoomOnCanvas(newMap) {
  currentMap = newMap;
  $("canvas").on("wheel", (event) => {
    const point = new paper.Point(event.clientX, event.clientY);
    zoom(-event.originalEvent.deltaY, point);
  });

  function allowedZoom(zoom) {
    if (zoom !== paper.view.zoom) {
      paper.view.zoom = zoom;
      return zoom;
    }
    return null;
  }

  function zoom(delta, point) {
    if (!delta) return;

    const oldZoom = paper.view.zoom;
    const oldCenter = paper.view.center;
    const viewPos = paper.view.viewToProject(point);
    const newZoom = delta > 0 ? oldZoom * 1.05 : oldZoom / 1.05;

    if (!allowedZoom(newZoom)) {
      return;
    }

    const zoomScale = oldZoom / newZoom;
    const centerAdjust = viewPos.subtract(oldCenter);
    const offset = viewPos
      .subtract(centerAdjust.multiply(zoomScale))
      .subtract(oldCenter);

    paper.view.center = paper.view.center.add(offset);

    currentMap.notifyAllStationsAndSegments();
  }
}
