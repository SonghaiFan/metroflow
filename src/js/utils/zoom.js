import paper from "paper";
import $ from "jquery";

const ZOOM_SETTINGS = {
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 5.0,
  ZOOM_FACTOR: 1.05,
};

let currentMap = null;
let isPanning = false;
let lastPoint = null;
let spaceKeyDown = false;

export function setCurrentMap(newMap) {
  currentMap = newMap;
}

// Public zoom function for toolbar buttons
export function zoom(direction) {
  zoomAtPoint(direction, paper.view.center);
}

export function enableZoomOnCanvas(canvas) {
  // Mouse wheel zoom
  $(canvas).on("wheel", (event) => {
    event.preventDefault();
    const point = new paper.Point(event.clientX, event.clientY);
    const delta = -event.originalEvent.deltaY;
    zoomAtPoint(delta, point);
  });

  // Keyboard shortcuts
  $(document).on("keydown", (event) => {
    // Ctrl/Cmd + Plus/Minus for zoom
    if (event.ctrlKey || event.metaKey) {
      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        zoom(1);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoom(-1);
      } else if (event.key === "0") {
        event.preventDefault();
        resetZoom();
      }
    }
  });
}

function allowedZoom(zoom) {
  const newZoom = Math.min(
    Math.max(zoom, ZOOM_SETTINGS.MIN_ZOOM),
    ZOOM_SETTINGS.MAX_ZOOM
  );
  if (newZoom !== paper.view.zoom) {
    paper.view.zoom = newZoom;
    return newZoom;
  }
  return null;
}

function zoomAtPoint(delta, point) {
  if (!delta) return;

  const oldZoom = paper.view.zoom;
  const oldCenter = paper.view.center;
  const viewPos = paper.view.viewToProject(point);

  // Calculate new zoom based on direction and zoom factor
  const newZoom =
    delta > 0
      ? oldZoom * ZOOM_SETTINGS.ZOOM_FACTOR
      : oldZoom / ZOOM_SETTINGS.ZOOM_FACTOR;

  if (!allowedZoom(newZoom)) {
    return;
  }

  const zoomScale = oldZoom / newZoom;
  const centerAdjust = viewPos.subtract(oldCenter);
  const offset = viewPos
    .subtract(centerAdjust.multiply(zoomScale))
    .subtract(oldCenter);

  paper.view.center = paper.view.center.add(offset);

  if (currentMap) {
    currentMap.notifyAllStationsAndSegments();
  }
}

export function resetZoom() {
  paper.view.zoom = 1.0;
  paper.view.center = new paper.Point(
    paper.view.viewSize.width / 2,
    paper.view.viewSize.height / 2
  );
  if (currentMap) {
    currentMap.notifyAllStationsAndSegments();
  }
}

export function enablePanning(canvas) {
  // Track space key state
  $(document).on("keydown", (event) => {
    if (event.code === "Space" && !spaceKeyDown) {
      spaceKeyDown = true;
      if (!isPanning) {
        $(canvas).css("cursor", "grab");
      }
      event.preventDefault(); // Prevent page scroll
    }
  });

  $(document).on("keyup", (event) => {
    if (event.code === "Space") {
      spaceKeyDown = false;
      if (!isPanning) {
        $(canvas).css("cursor", "default");
      }
    }
  });

  // Handle mouse events for panning
  $(canvas).on("mousedown", (event) => {
    // Start panning with middle mouse button or space + left click
    if (event.button === 1 || (event.button === 0 && spaceKeyDown)) {
      event.preventDefault();
      isPanning = true;
      lastPoint = new paper.Point(event.clientX, event.clientY);
      $(canvas).css("cursor", "grabbing");

      // Disable any ongoing node dragging
      if (window.currentToolMode === "select") {
        const selectedElements = paper.project.selectedItems;
        selectedElements.forEach((item) => (item.selected = false));
      }
    }
  });

  $(document).on("mousemove", (event) => {
    // Show grab cursor when space is held and not panning
    if (spaceKeyDown && !isPanning) {
      $(canvas).css("cursor", "grab");
    }

    // Handle panning movement
    if (isPanning && lastPoint) {
      const newPoint = new paper.Point(event.clientX, event.clientY);
      const delta = newPoint.subtract(lastPoint);
      paper.view.center = paper.view.center.subtract(
        delta.divide(paper.view.zoom)
      );
      lastPoint = newPoint;

      if (currentMap) {
        currentMap.notifyAllStationsAndSegments();
      }
    }
  });

  $(document).on("mouseup mouseleave", () => {
    if (isPanning) {
      isPanning = false;
      lastPoint = null;
      $(canvas).css("cursor", spaceKeyDown ? "grab" : "default");
    }
  });

  // Handle cursor when leaving/entering the canvas
  $(canvas).on("mouseenter", () => {
    if (spaceKeyDown && !isPanning) {
      $(canvas).css("cursor", "grab");
    }
  });

  $(canvas).on("mouseleave", () => {
    if (!isPanning) {
      $(canvas).css("cursor", "default");
    }
  });
}

// Export panning state for other modules
export function isPanningActive() {
  return isPanning || spaceKeyDown;
}

// Export all zoom-related functions and state
export const zoomUtils = {
  zoom,
  resetZoom,
  enableZoomOnCanvas,
  enablePanning,
  isPanningActive,
  setCurrentMap,
};
