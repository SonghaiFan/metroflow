import paper from "paper";
import { createMap } from "./map";

export function saveMap(map) {
  const mapData = {
    tracks: map.tracks.map((track) => createTrackData(track)),
    connections: map.connections.map((connection) =>
      createConnectionData(connection)
    ),
  };

  console.log(mapData);
  return JSON.stringify(mapData);
}

function createTrackData(track) {
  return {
    id: track.id,
    segmentStyle: track.segmentStyle,
    stationStyle: track.stationStyle,
    segments: track.segments.map((segment) => createSegmentData(segment)),
  };
}

function createConnectionData(connection) {
  return {
    stationA: connection.stationA.id,
    stationB: connection.stationB.id,
    id: connection.id,
  };
}

function createSegmentData(segment) {
  return {
    stationA: createStationData(segment.stationA),
    stationB: createStationData(segment.stationB),
    stationsUser: segment.stationsUser.map((station) =>
      createStationData(station)
    ),
    stationsAuto: segment.stationsAuto.map((station) =>
      createStationData(station)
    ),
    id: segment.id,
  };
}

function createStationData(station) {
  return {
    position: { x: station.position.x, y: station.position.y },
    id: station.id,
    name: station.name,
    offsetFactor: station.offsetFactor,
  };
}

function createStationMinorData(station) {
  return {
    position: { x: station.position.x, y: station.position.y },
    id: station.id,
    name: station.name,
    stationA: station.stationA.id,
    stationB: station.stationB.id,
  };
}

export function loadMap(mapJSON) {
  console.log("loadMap");
  if (!mapJSON) {
    mapJSON = {
      tracks: [
        {
          id: "3794c750-6605-49df-b810-aa5b0ebb42e8",
          segmentStyle: {
            strokeColor: "red",
            strokeWidth: 8,
            selectionColor: "green",
            fullySelected: false,
          },
          stations: [
            { position: { x: 152, y: 239 }, id: "3fe7243d", name: "station" },
            { position: { x: 687, y: 495 }, id: "995a2376", name: "station" },
          ],
          stationsMinor: [],
        },
        {
          id: "6fe22ae9-cd61-4705-aa2d-c457e11901e9",
          segmentStyle: {
            strokeColor: "blue",
            strokeWidth: 8,
            selectionColor: "green",
            fullySelected: false,
          },
          stations: [
            { position: { x: 174, y: 142 }, id: "8cb86074", name: "station" },
            { position: { x: 764, y: 433 }, id: "882322b8", name: "station" },
          ],
          stationsMinor: [],
        },
      ],
    };
  } else if (typeof mapJSON === "string") {
    mapJSON = JSON.parse(mapJSON);
  }

  const map = createMap();
  mapJSON.tracks.forEach((trackData) => loadTrack(map, trackData));
  mapJSON.connections?.forEach((connectionData) =>
    loadConnections(map, connectionData)
  );

  return map;
}

function loadConnections(map, connectionData) {
  console.log("load connections");
  const stationA = map.findStation(connectionData.stationA);
  const stationB = map.findStation(connectionData.stationB);
  const connection = map.createConnection(stationA, stationB);

  if (connection) {
    connection.id = connectionData.id;
  }
  return connection;
}

function loadTrack(map, trackData) {
  console.log("load track");
  const track = map.createTrack();
  track.id = trackData.id;
  track.setSegmentStyle(trackData.segmentStyle);
  track.setStationStyle(trackData.stationStyle);

  trackData.segments.forEach((segmentData) =>
    loadSegment(map, track, segmentData)
  );

  return track;
}

function loadSegment(map, track, segmentData) {
  console.log("load segment");
  const stationAPoint = new paper.Point(
    segmentData.stationA.position.x,
    segmentData.stationA.position.y
  );
  const stationBPoint = new paper.Point(
    segmentData.stationB.position.x,
    segmentData.stationB.position.y
  );
  const stationA = map.findStation(segmentData.stationA.id);
  const stationB = map.findStation(segmentData.stationB.id);

  let segment = null;

  if (stationA && stationB) {
    segment = track.createSegment(stationA, stationB);
  } else if (stationA) {
    const newStationB = track.createStationFree(stationBPoint, stationA);
    newStationB.id = segmentData.stationB.id;
    newStationB.name = segmentData.stationB.name;
    segment = track.findSegmentsForStation(newStationB)[0];
  } else if (stationB) {
    const newStationA = track.createStationFree(stationAPoint);
    newStationA.id = segmentData.stationA.id;
    newStationA.name = segmentData.stationA.name;
    segment = track.createSegment(newStationA, stationB);
  } else {
    const newStationA = track.createStationFree(stationAPoint);
    newStationA.id = segmentData.stationA.id;
    newStationA.name = segmentData.stationA.name;
    const newStationB = track.createStationFree(stationBPoint);
    newStationB.id = segmentData.stationB.id;
    newStationB.name = segmentData.stationB.name;
    segment = track.createSegment(newStationA, newStationB);
  }

  console.assert(segment);

  // Draw the segment to ensure it has a path
  segment.draw();

  segmentData.stationsUser.forEach((stationData) => {
    if (
      segment.stationA.id === stationData.id ||
      segment.stationB.id === stationData.id
    ) {
      return;
    }
    const station = track.createStationOnSegment(
      segment,
      stationData.offsetFactor
    );
    station.offsetFactor = stationData.offsetFactor;
    station.id = stationData.id;
    station.name = stationData.name;
  });

  segmentData.stationsAuto.forEach((stationData) => {
    const position = new paper.Point(
      stationData.position.x,
      stationData.position.y
    );
    const station = track.createStationMinor(position, segment);
    station.id = stationData.id;
    station.name = stationData.name;
  });

  return segment;
}
