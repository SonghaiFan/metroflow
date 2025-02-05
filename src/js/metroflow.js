import paper from "paper";

// Import modules
import { DisplaySettings, Observer } from "./utils/util";
import { createMap, createDrawSettings, DrawSettings } from "./core/map";
import { createTrack } from "./core/track";
import { createSegment } from "./core/segment";
import {
  createStation,
  createStationMinor,
  createStationSegment,
} from "./core/station";
import { createConnection } from "./core/connection";
import * as styles from "./utils/styles";
import * as snap from "./utils/snap";
import * as serialize from "./utils/serialize";
import * as revision from "./utils/revision";
import * as zoom from "./utils/zoom";
import * as interaction from "./editor/interaction";

// Export modules
export { DisplaySettings, Observer };
export {
  createMap,
  createTrack,
  createSegment,
  createStation,
  createStationMinor,
  createStationSegment,
  createConnection,
};
export { styles, snap, serialize, revision, zoom, interaction };

// Export map-related functions
export const map = {
  createMap,
  createDrawSettings,
  DrawSettings,
};

// Initialize function
export function initialize(canvas) {
  // Initialize Paper.js on the canvas
  paper.setup(canvas);

  // Create a new Paper.js tool for handling mouse events
  const tool = new paper.Tool();
  tool.onMouseDown = interaction.handleMouseDown;
  tool.onMouseDrag = interaction.handleMouseDrag;
  tool.onMouseUp = interaction.handleMouseUp;

  // Return initialized components
  return {
    map: createMap(),
    track: createTrack,
    segment: createSegment,
    station: createStation,
    connection: createConnection(),
    snap: snap,
  };
}
