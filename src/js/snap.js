import paper from "paper";
import { Segment } from "./segment";

export class SnapManager {
  static MIN_SNAP_DISTANCE = Segment.minStraight + Segment.arcRadius * 2.0;

  static snapPosition(track, station, position) {
    let stations = track.connectedStations(station);

    // If no connected stations but there's a last added station, use that
    if (stations.length === 0 && track.lastAddedStation()) {
      stations = [track.lastAddedStation()];
    }

    // Find nearest stations for X and Y alignment
    const nearest = stations.reduce(
      (acc, currentStation) => {
        const stationVector = position.subtract(currentStation.position);
        const deltaX = Math.abs(stationVector.x);
        const deltaY = Math.abs(stationVector.y);

        return {
          x:
            deltaX < acc.minDistanceX
              ? {
                  station: currentStation,
                  distance: deltaX,
                }
              : acc.x,
          y:
            deltaY < acc.minDistanceY
              ? {
                  station: currentStation,
                  distance: deltaY,
                }
              : acc.y,
          minDistanceX: Math.min(deltaX, acc.minDistanceX),
          minDistanceY: Math.min(deltaY, acc.minDistanceY),
        };
      },
      {
        x: null,
        y: null,
        minDistanceX: Infinity,
        minDistanceY: Infinity,
      }
    );

    // Apply snapping
    const snapX =
      nearest.minDistanceX < this.MIN_SNAP_DISTANCE
        ? nearest.x.station.position.x
        : position.x;

    const snapY =
      nearest.minDistanceY < this.MIN_SNAP_DISTANCE
        ? nearest.y.station.position.y
        : position.y;

    return new paper.Point(snapX, snapY);
  }
}
