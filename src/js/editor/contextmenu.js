import $ from "jquery";
import "../metroflow";

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
