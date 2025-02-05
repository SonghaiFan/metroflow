import paper from "paper";
import { Observable } from "../utils/util";
import { createTrack } from "./track";
import { createConnection } from "./connection";

export const DrawSettings = {
  text: true,
  fast: false,
  calcTextPositions: false,
  minorStationText: false,
};

export function createDrawSettings() {
  return { ...DrawSettings };
}

export class Map extends Observable {
  constructor() {
    super();
    this.tracks = [];
    this.connections = [];
  }

  addTrack(track) {
    console.log("map.addTrack()");
    this.tracks.push(track);
    this.notifyAllObservers();
    return track;
  }

  createTrack() {
    console.log("map.createTrack()");
    const newTrack = createTrack();
    this.tracks.push(newTrack);
    return newTrack;
  }

  createConnection(stationA, stationB) {
    console.log("map.createConnection()");
    if (stationA.id === stationB.id) {
      return null;
    }
    const newConnection = createConnection(stationA, stationB);
    this.connections.push(newConnection);
    return newConnection;
  }

  removeStation(id) {
    this.tracks.forEach((track) => track.removeStation(id));
    this.connections = this.connections.filter(
      (connection) =>
        connection.stationA.id !== id && connection.stationB.id !== id
    );
  }

  stations() {
    return this.tracks.reduce((acc, track) => acc.concat(track.stations), []);
  }

  segments() {
    return this.tracks.reduce((acc, track) => acc.concat(track.segments), []);
  }

  draw(drawSettings) {
    console.time("map.draw");
    paper.project.clear();

    // Clear any existing text items first
    paper.project.activeLayer.children.forEach((child) => {
      if (child instanceof paper.PointText) {
        child.remove();
      }
    });

    this.tracks.forEach((track) => track.draw(drawSettings));
    this.connections.forEach((connection) => connection.draw());

    if (drawSettings.text) {
      const paths = !drawSettings.fast ? this.allPaths() : [];
      this.drawStationNames(paths, drawSettings);
    }
    console.timeEnd("map.draw");
  }

  clear() {
    this.tracks = [];
  }

  drawStationNames(paths, drawSettings) {
    this.tracks.forEach((track) => {
      track.drawStationNames(paths, drawSettings);
    });
  }

  allPaths() {
    const trackPaths = this.tracks.reduce(
      (acc, track) => acc.concat(track.allPaths()),
      []
    );
    const connectionPaths = this.connections.reduce(
      (acc, connection) => acc.concat(connection.allPaths()),
      []
    );
    return [...trackPaths, ...connectionPaths];
  }

  findStation(id) {
    for (const track of this.tracks) {
      const station = track.findStation(id);
      if (station) return station;
    }
    return null;
  }

  findStationByPathId(id) {
    for (const track of this.tracks) {
      const station = track.findStationByPathId(id);
      if (station) return { station, track };
    }
    return { station: null, track: null };
  }

  findSegment(id) {
    for (const track of this.tracks) {
      const segment = track.findSegment(id);
      if (segment) return { segment, track };
    }
    return { segment: null, track: null };
  }

  findSegmentByPathId(id) {
    for (const track of this.tracks) {
      const segment = track.findSegmentByPathId(id);
      if (segment) return { segment, track };
    }
    return { segment: null, track: null };
  }

  findTrack(id) {
    return this.tracks.find((track) => track.id === id) || null;
  }

  notifyAllStationsAndSegments() {
    this.stations().forEach((station) => station.notifyAllObservers());
    this.segments().forEach((segment) => segment.notifyAllObservers());
  }
}

// Factory function for backward compatibility
export function createMap() {
  return new Map();
}
