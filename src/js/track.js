import paper from "paper";
import { v4 as uuidv4 } from "uuid";
import { Observable } from "./util";
import { Segment } from "./segment";
import { Station, StationMinor } from "./station";
import { Styles } from "./styles";

export class Track {
  constructor() {
    this.segments = [];
    this.id = uuidv4();
    this.stations = [];
    this.stationsMajor = [];
    this.stationsMinor = [];
    this.segmentStyle = Styles.createSegmentStyle();
    this.stationStyle = Styles.createStationStyle();
    this.stationMinorStyle = Styles.createStationMinorStyle();
    this.stationMinorStyle.strokeColor = this.segmentStyle.strokeColor;
  }

  setStationRadius(radius) {
    this.stationStyle.stationRadius = radius;
  }

  setStationStrokeWidth(strokeWidth) {
    this.stationStyle.strokeWidth = strokeWidth;
  }

  setSegmentStyle(style) {
    this.segmentStyle = style;
    this.stationMinorStyle.strokeWidth = this.segmentStyle.strokeWidth;
    this.stationMinorStyle.strokeColor = this.segmentStyle.strokeColor;
    this.stationMinorStyle.minorStationSize =
      this.segmentStyle.strokeWidth * 2.0;
  }

  setStationStyle(style) {
    this.stationStyle = style;
  }

  createStationFree(position, previousStation) {
    const station = new Station(position, this.stationStyle);
    if (previousStation) {
      const segment = this.createSegment(previousStation, station);
      segment.draw();
    }
    this.stations.push(station);
    this.stationsMajor.push(station);
    station.draw();
    console.log("create station", station.id);
    this.notifyObservers();
    return station;
  }

  createStationOnSegment(segment, offsetFactor) {
    // Ensure segment is drawn first
    if (!segment.path) {
      segment.draw();
    }
    const point = segment.path.getPointAt(segment.path.length * offsetFactor);
    const station = new Station(point, this.stationStyle);
    this.stations.push(station);
    this.stationsMajor.push(station);
    segment.addStation(station);
    this.notifyObservers();
    return station;
  }

  createSegment(stationA, stationB) {
    console.log("track.createSegment", stationA.id, stationB.id);
    const segment = new Segment(stationA, stationB, this.segmentStyle);
    this.segments.push(segment);
    this.notifyObservers();
    return segment;
  }

  createStationMinor(position, segment) {
    const nearestPoint = segment.path.getNearestPoint(position);
    const station = new StationMinor(
      nearestPoint,
      segment.stationA,
      segment.stationB,
      this.stationMinorStyle
    );
    segment.addStation(station);
    this.stations.push(station);
    this.stationsMinor.push(station);
    this.notifyObservers();
    return station;
  }

  draw(drawSettings = {}) {
    // Draw segments
    this.segments.forEach((segment) => {
      const previous = this.segmentToStation(segment.stationA);
      segment.draw(previous, drawSettings);
    });

    // Draw minor stations
    this.stationsMinor.forEach((station) => {
      const segment = this.findSegmentForStation(station);
      station.draw(segment);
    });

    // Draw major stations
    this.stationsMajor.forEach((station) => station.draw());

    // Draw station names if enabled
    if (drawSettings.text) {
      this.drawStationNames(drawSettings);
    }
  }

  drawStationNames(drawSettings) {
    const paths = this.segments.map((segment) => segment.path);

    // Draw major station names
    this.stationsMajor.forEach((station) => {
      const text = new paper.PointText({
        point: station.position.add(
          new paper.Point(
            station.style.stationRadius + station.style.strokeWidth,
            drawSettings.fontSize / 4
          )
        ),
        content: station.name,
        fontSize: drawSettings.fontSize || 14,
        fillColor: "black",
      });

      if (drawSettings.calcTextPositions) {
        this.optimizeTextPosition(text, station, paths);
      }
    });

    // Draw minor station names if enabled
    if (drawSettings.minorStationText) {
      this.stationsMinor.forEach((station) => {
        const direction = station.direction();
        const text = new paper.PointText({
          point: station.position.add(
            direction.multiply(station.style.minorStationSize * 1.2)
          ),
          content: station.name,
          fontSize: drawSettings.minorFontSize || 10,
          fillColor: "black",
        });

        this.adjustMinorStationText(text, direction);
      });
    }
  }

  optimizeTextPosition(text, station, paths) {
    const positions = this.calculateTextPositions(text, station);
    let bestPosition = positions[0];
    let minIntersections = Number.MAX_VALUE;

    positions.forEach((position) => {
      text.position = station.position.add(position);
      const intersections = paths.filter((path) =>
        text.intersects(path)
      ).length;
      if (intersections < minIntersections) {
        minIntersections = intersections;
        bestPosition = position;
      }
    });

    text.position = station.position.add(bestPosition);
    station.textPositionRel = bestPosition;
  }

  calculateTextPositions(text, station) {
    const r = station.style.stationRadius + station.style.strokeWidth;
    const w = text.bounds.width;
    const h = text.bounds.height;

    return [
      new paper.Point(r, h / 4),
      new paper.Point(-r - w, h / 4),
      new paper.Point(0, -r * 1.2),
      new paper.Point(r, -r * 0.8),
      new paper.Point(-w, -r * 1.2),
      new paper.Point(-w - r, -r * 0.8),
      new paper.Point(0, r * 2.2),
      new paper.Point(r, r * 1.4),
      new paper.Point(-w, r * 2.2),
      new paper.Point(-w - r, r * 1.2),
    ];
  }

  adjustMinorStationText(text, direction) {
    // Rotate text to match the direction of the minor station line
    const angle = Math.atan2(direction.y, direction.x);
    text.rotate((angle * 180) / Math.PI);

    // Adjust text position based on its rotation
    const textWidth = text.bounds.width;
    const textHeight = text.bounds.height;
    const offset = direction.multiply(textWidth / 2);
    text.position = text.position.add(offset);

    // Ensure text is always readable from left to right
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
      text.rotate(180);
    }
  }

  // Helper methods
  segmentToStation(station) {
    return this.segments.find((segment) => segment.stationB.id === station.id);
  }

  segmentFromStation(station) {
    return this.segments.find((segment) => segment.stationA.id === station.id);
  }

  connectedStations(station) {
    const stations = [];
    this.segments.forEach((segment) => {
      if (segment.stationA === station) {
        stations.push(segment.stationB);
      } else if (segment.stationB === station) {
        stations.push(segment.stationA);
      }
    });
    return stations;
  }

  lastAddedStation() {
    return this.stationsMajor[this.stationsMajor.length - 1];
  }

  findSegmentForStation(station) {
    return this.segments.find((segment) =>
      segment.stations.some((s) => s.id === station.id)
    );
  }

  findStation(id) {
    return this.stations.find((station) => station.id === id);
  }

  findStationByPathId(pathId) {
    return this.stations.find(
      (station) => station.path && station.path.id === pathId
    );
  }

  findSegment(id) {
    return this.segments.find((segment) => segment.id === id);
  }

  findSegmentByPathId(pathId) {
    return this.segments.find(
      (segment) => segment.path && segment.path.id === pathId
    );
  }

  findSegmentsForStation(station) {
    return this.segments.filter((segment) =>
      segment.stations.some((s) => s.id === station.id)
    );
  }

  notifyObservers() {
    // Implement observer pattern if needed
  }

  allPaths() {
    const paths = [];
    // Add segment paths
    this.segments.forEach((segment) => {
      if (segment.path) {
        paths.push(segment.path);
      }
    });
    // Add station paths
    this.stations.forEach((station) => {
      if (station.path) {
        paths.push(station.path);
      }
    });
    return paths;
  }
}

export function createTrack() {
  const track = new Track();
  Object.assign(track, new Observable());
  return track;
}
