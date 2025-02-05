import paper from "paper";
import { v4 as uuidv4 } from "uuid";
import { Observable } from "./util";
import { Styles } from "./styles";

export class Station extends Observable {
  constructor(position, style) {
    super();
    console.log("new station for point", position);
    this.position = position;
    this.offsetFactor = null;
    this.style = style || Styles.createStationStyle();
    this.id = uuidv4().substring(0, 8);
    this.path = null;
    this.isSelected = false;
    this.name = "station";
    this.textPositionRel = null;
    this.doSnap = true;
  }

  toggleSelect() {
    this.isSelected ? this.deselect() : this.select();
  }

  select() {
    this.isSelected = true;
  }

  deselect() {
    this.isSelected = false;
  }

  setPosition(position, segment) {
    this.doSetPosition(position, segment);
    this.textPositionRel = null;
    this.notifyAllObservers();
  }

  draw() {
    if (this.path) {
      this.path.remove();
    }

    this.path = new paper.Path.Circle({
      center: this.position,
      radius: this.style.stationRadius,
      strokeColor: this.isSelected
        ? this.style.selectionColor
        : this.style.strokeColor,
      strokeWidth: this.style.strokeWidth,
      fillColor: this.style.fillColor,
    });

    this.path.bringToFront();
  }

  updatePosition(segment, notifyObservers = true) {
    // For regular stations, just use the current position
    this.doSetPosition(this.position, segment);
    if (notifyObservers) {
      this.notifyAllObservers();
    }
  }

  doSetPosition(position, segment) {
    this.position = position;
  }
}

export class StationMinor extends Station {
  constructor(position, stationA, stationB, style) {
    super(position, style || Styles.createStationMinorStyle());
    this.stationA = stationA;
    this.stationB = stationB;
    this.name = "minor station";
    this.doSnap = false;
    this.normalUnit = null;
  }

  draw(segment) {
    if (this.path) {
      this.path.remove();
    }

    const minorStationSize = this.style.minorStationSize;
    this.path = new paper.Path({
      segments: [
        this.position,
        this.position.add(this.normalUnit.multiply(minorStationSize)),
      ],
      strokeColor: this.style.strokeColor,
      strokeWidth: this.style.strokeWidth,
    });
  }

  direction() {
    return this.path.lastSegment.point
      .subtract(this.path.firstSegment.point)
      .normalize();
  }

  doSetPosition(position, segment) {
    this.position = position;
  }

  updatePosition(segment, notifyObservers = true) {
    const offsetFactor = segment.getOffsetOf(this.position) / segment.length();
    const offset = segment.path.length * offsetFactor;
    this.position = segment.path.getPointAt(offset);

    const previousStationInfo = segment.getPreviousStation(this.position);
    const nextStationInfo = segment.getNextStation(this.position);
    const stationsAuto = segment.getStationsBetween(
      previousStationInfo.station,
      nextStationInfo.station
    );

    const offsetA = previousStationInfo.offset;
    const offsetB = nextStationInfo.offset;
    const totalLength = offsetB - offsetA;
    const distanceBetweenStations = totalLength / (stationsAuto.length + 1);
    const orderNr = stationsAuto.indexOf(this);
    const stationOffset = distanceBetweenStations * (orderNr + 1) + offsetA;

    const position = segment.path.getPointAt(stationOffset);
    if (position) {
      this.position = position;
      this.offsetFactor = segment.getOffsetOf(position) / segment.length();
      this.normalUnit = segment.path.getNormalAt(stationOffset);

      if (notifyObservers) {
        this.notifyAllObservers();
      }
    }

    return this.position;
  }
}

export class StationSegment extends Station {
  constructor(offsetFactor, style) {
    super(new paper.Point(0, 0), style);
    this.offsetFactor = offsetFactor;
    this.doSnap = false;
  }

  doSetPosition(position, segment) {
    this.offsetFactor = segment.getOffsetOf(position) / segment.length();
  }

  updatePosition(segment, notifyObservers = true) {
    const distanceStation = segment.path.length * this.offsetFactor;
    this.position = segment.path.getPointAt(distanceStation);

    if (notifyObservers) {
      this.notifyAllObservers();
    }

    return this.position;
  }
}

// Factory functions
export function createStation(position, style) {
  return new Station(position, style);
}

export function createStationSegment(offsetFactor, style) {
  return new StationSegment(offsetFactor, style);
}

export function createStationMinor(position, stationA, stationB, style) {
  return new StationMinor(position, stationA, stationB, style);
}
