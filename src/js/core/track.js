import paper from "paper";
import { v4 as uuidv4 } from "uuid";
import { Observable } from "../utils/util";
import { Segment } from "./segment";
import { Station, StationMinor } from "./station";
import { Styles } from "../utils/styles";
import { optimizeTextPosition, adjustMinorStationText } from "../utils/text";

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

  createStationMinorOnSegmentId(position, segmentId) {
    const segment = this.findSegment(segmentId);
    position = segment.path.getNearestPoint(position);
    return this.createStationMinor(position, segment);
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

  segmentToStation(station) {
    return this.segments.find((s) => s.stationB.id === station.id) || null;
  }

  segmentFromStation(station) {
    return this.segments.find((s) => s.stationA.id === station.id) || null;
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
      // Remove existing text if any
      if (station.textElement) {
        station.textElement.remove();
      }

      const text = new paper.PointText({
        point: station.position.add(
          station.textPositionRel ||
            new paper.Point(
              station.style.stationRadius + station.style.strokeWidth,
              drawSettings.fontSize / 4
            )
        ),
        content: station.name,
        fontSize: drawSettings.fontSize || 14,
        fillColor: "black",
      });

      // Store reference to text element
      station.textElement = text;

      // Only calculate position if no custom position exists and calcTextPositions is true
      if (!station.textPositionRel && drawSettings.calcTextPositions) {
        optimizeTextPosition(text, station, paths);
      }

      // Make text draggable
      text.onMouseDrag = function (event) {
        this.position = event.point;
        // Store relative position from station
        station.textPositionRel = event.point.subtract(station.position);
      };

      // Visual feedback on hover
      text.onMouseEnter = function () {
        document.body.style.cursor = "move";
        this.fillColor = "#FFD700";
      };

      text.onMouseLeave = function () {
        document.body.style.cursor = "default";
        this.fillColor = "black";
      };
    });

    // Draw minor station names if enabled
    if (drawSettings.minorStationText) {
      this.stationsMinor.forEach((station) => {
        // Remove existing text if any
        if (station.textElement) {
          station.textElement.remove();
        }

        const direction = station.direction();
        const text = new paper.PointText({
          point: station.position.add(
            station.textPositionRel ||
              direction.multiply(station.style.minorStationSize * 1.2)
          ),
          content: station.name,
          fontSize: drawSettings.minorFontSize || 10,
          fillColor: "black",
        });

        // Store reference to text element
        station.textElement = text;

        // Only adjust if no custom position exists
        if (!station.textPositionRel) {
          adjustMinorStationText(text, direction);
        }

        // Make text draggable
        text.onMouseDrag = function (event) {
          this.position = event.point;
          // Store relative position from station
          station.textPositionRel = event.point.subtract(station.position);
        };

        // Visual feedback on hover
        text.onMouseEnter = function () {
          document.body.style.cursor = "move";
          this.fillColor = "#007bff";
        };

        text.onMouseLeave = function () {
          document.body.style.cursor = "default";
          this.fillColor = "black";
        };
      });
    }
  }

  lastAddedStation() {
    return this.stationsMajor[this.stationsMajor.length - 1] || null;
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

  allPaths() {
    const paths = [];
    for (const i in this.segments) {
      paths.push(this.segments[i].path);
    }
    return paths;
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

  handleStationCreation(point, snapEnabled = true) {
    // Try to create station on existing segment first
    const hitResult = paper.project.hitTest(point, {
      segments: true,
      stroke: true,
      fill: true,
      tolerance: 5,
    });

    let station;
    if (hitResult && hitResult.item) {
      const segment = this.findSegmentByPathId(hitResult.item.id);
      if (segment) {
        const offsetFactor = segment.getOffsetOf(point) / segment.length();
        station = this.createStationOnSegment(segment, offsetFactor);
        station.doSnap = false; // Disable snapping for segment-bound stations
      }
    }

    if (!station) {
      // Create free station if no segment hit
      station = this.createStationFree(point);
      station.doSnap = snapEnabled;
    }

    return station;
  }

  handleMinorStationCreation(point, segment) {
    if (!segment) return null;

    const station = this.createStationMinor(point, segment);
    station.doSnap = false;
    station.name = "minor station";

    // Auto-position the station along the segment
    const previousStation = segment.getPreviousStation(point);
    const nextStation = segment.getNextStation(point);
    const stationsAuto = segment.getStationsBetween(
      previousStation.station,
      nextStation.station
    );
    const totalLength = nextStation.offset - previousStation.offset;
    const distanceBetweenStations = totalLength / (stationsAuto.length + 1);
    const orderNr = stationsAuto.indexOf(station);
    const stationOffset =
      distanceBetweenStations * (orderNr + 1) + previousStation.offset;

    const position = segment.path.getPointAt(stationOffset);
    if (position) {
      station.setPosition(position);
    }

    return station;
  }

  deselectAllStations() {
    this.stations.forEach((station) => station.deselect());
  }
}

export function createTrack() {
  const track = new Track();
  Object.assign(track, new Observable());
  return track;
}
