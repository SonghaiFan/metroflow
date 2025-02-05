import paper from "paper";

// Import modules
import { DisplaySettings, Observer } from "./util";
import { createMap, createDrawSettings, DrawSettings } from "./map";
import { createTrack } from "./track";
import { createSegment } from "./segment";
import {
  createStation,
  createStationMinor,
  createStationSegment,
} from "./station";
import { createConnection } from "./connection";
import * as styles from "./styles";
import * as snap from "./snap";
import * as serialize from "./serialize";
import * as revision from "./revision";
import * as zoom from "./controls/zoom";
import * as interaction from "./interaction";

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
  };
}
