import $ from "jquery";
import "../metroflow";
import paper from "paper";

export function createStationContextMenu(stationElementId, onRemoveStation) {
  console.assert(stationElementId);
  $.contextMenu({
    selector: `#${stationElementId}`,
    trigger: "none",
    callback: (key, options) => {
      if (key === "delete") {
        const stationId = $(options.selector).data("station-id");
        onRemoveStation(stationId);
      }
    },
    items: {
      delete: { name: "Delete", icon: "delete" },
    },
  });
}

export function createSegmentContextMenu(
  segmentElementId,
  onCreateStationMinor
) {
  $.contextMenu({
    selector: `#${segmentElementId}`,
    trigger: "none",
    callback: (key, options) => {
      const segmentId = $(options.selector).data("segment-id");
      if (key === "createMinorStation") {
        const position = $(options.selector).data("position");
        onCreateStationMinor(position, segmentId);
      }
    },
    items: {
      createMinorStation: { name: "Add minor station", icon: "add" },
    },
  });
}

export function initializeContextMenus(app) {
  // Initialize station context menu
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

  // Initialize segment context menu
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
}
