import paper from "paper";
import { v4 as uuidv4 } from "uuid";
import { Observable, DisplaySettings } from "../utils/util";

export class Segment extends Observable {
  static arcRadius = 8.0;
  static minStraight = 4.0 * this.arcRadius;

  constructor(stationA, stationB, style) {
    super();
    this.stationA = stationA;
    this.stationB = stationB;
    this.stations = [stationA, stationB];
    this.stationsAuto = [];
    this.stationsUser = [stationA, stationB];
    this.style = style;
    this.id = uuidv4();
    this.path = null;
    this.isSelected = false;
  }

  addStation(station) {
    this.stationsAuto.push(station);
    this.stations.push(station);
    this.notifyAllObservers();
  }

  addStationAuto(station) {
    this.stationsAuto.push(station);
    this.stations.push(station);
  }

  addStationUser(station) {
    this.stationsUser.push(station);
    this.stations.push(station);
  }

  begin() {
    return this.stationA.position;
  }

  end() {
    return this.stationB.position;
  }

  direction() {
    return this.end().subtract(this.begin());
  }

  center() {
    return this.begin().add(this.direction().divide(2));
  }

  length() {
    return this.path.length;
  }

  getOffsetOf(position) {
    console.assert(position.x != null);
    console.assert(this.path != null, this);
    const nearestPoint = this.path.getNearestPoint(position);
    return this.path.getOffsetOf(nearestPoint);
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

  removeStation(id) {
    const station = this.findStation(id);
    if (!station) return;

    const removeFromArray = (array, item) => {
      const index = array.indexOf(item);
      if (index > -1) {
        array.splice(index, 1);
      }
    };

    removeFromArray(this.stations, station);
    removeFromArray(this.stationsAuto, station);
    removeFromArray(this.stationsUser, station);
  }

  getAllOnSegmentStations() {
    const stations = [...this.stationsAuto, ...this.stationsUser];
    return stations.filter(
      (station) => station !== this.stationA && station !== this.stationB
    );
  }

  removeAllOnSegmentStations() {
    const stationsToRemove = this.getAllOnSegmentStations();

    stationsToRemove.forEach((station) => {
      const autoIndex = this.stationsAuto.indexOf(station);
      if (autoIndex > -1) this.stationsAuto.splice(autoIndex, 1);

      const userIndex = this.stationsUser.indexOf(station);
      if (userIndex > -1) this.stationsUser.splice(userIndex, 1);

      const stationIndex = this.stations.indexOf(station);
      if (stationIndex > -1) this.stations.splice(stationIndex, 1);
    });

    return stationsToRemove;
  }

  createNewPath() {
    return new paper.Path({
      strokeColor: this.isSelected
        ? this.style.selectionColor
        : this.style.strokeColor,
      strokeWidth: this.style.strokeWidth,
      strokeCap: "round",
      strokeJoin: "round",
      fullySelected: DisplaySettings.isDebug,
    });
  }

  getNearestStation(position, direction) {
    console.assert(position.x != null);
    const offsetPosition = this.getOffsetOf(position);

    return this.stationsUser.reduce(
      (nearest, station) => {
        const offset = this.getOffsetOf(station.position);
        const difference = (offset - offsetPosition) * direction;

        if (difference > 0 && difference < nearest.differenceMin) {
          return {
            station,
            offset,
            differenceMin: difference,
          };
        }
        return nearest;
      },
      {
        station: null,
        offset: null,
        differenceMin: Infinity,
      }
    );
  }

  getNextStation(position) {
    const stationInfo = this.getNearestStation(position, 1);
    return {
      station: stationInfo.station || this.stationB,
      offset: stationInfo.offset,
    };
  }

  getPreviousStation(position) {
    const stationInfo = this.getNearestStation(position, -1);
    return {
      station: stationInfo.station || this.stationA,
      offset: stationInfo.offset,
    };
  }

  getStationsBetween(stationA, stationB) {
    const offsetA = this.getOffsetOf(stationA.position);
    const offsetB = this.getOffsetOf(stationB.position);

    return this.stationsAuto.filter((station) => {
      const offset = this.getOffsetOf(station.position);
      return offset >= offsetA && offset <= offsetB;
    });
  }

  findStation(id) {
    return this.stations.find((station) => station.id === id);
  }

  createPath(previous) {
    if (this.path) {
      this.path.remove();
    }

    const stationVector = this.direction();
    const maxDistance =
      Math.min(Math.abs(stationVector.x), Math.abs(stationVector.y)) -
      Segment.minStraight;

    let straightBegin = Math.abs(stationVector.y) - maxDistance;
    let straightEnd = Math.abs(stationVector.x) - maxDistance;

    straightBegin = Math.max(straightBegin, Segment.minStraight);
    straightEnd = Math.max(straightEnd, Segment.minStraight);

    let arcBeginRel = new paper.Point(0, straightBegin).multiply(
      Math.sign(stationVector.y)
    );
    let arcEndRel = new paper.Point(straightEnd, 0).multiply(
      Math.sign(stationVector.x)
    );

    if (previous) {
      const tangentEndLastPath = previous.path.getTangentAt(
        previous.path.length
      );
      const inSameDirectionOutX =
        Math.sign(stationVector.x) - tangentEndLastPath.x !== 0;
      const inSameDirectionOutY =
        Math.sign(stationVector.y) - tangentEndLastPath.y !== 0;

      if (tangentEndLastPath.x !== 0 && !inSameDirectionOutX) {
        arcBeginRel = new paper.Point(straightEnd, 0).multiply(
          Math.sign(stationVector.x)
        );
        arcEndRel = new paper.Point(0, straightBegin).multiply(
          Math.sign(stationVector.y)
        );
      } else if (tangentEndLastPath.y !== 0 && inSameDirectionOutY) {
        arcBeginRel = new paper.Point(straightEnd, 0).multiply(
          Math.sign(stationVector.x)
        );
        arcEndRel = new paper.Point(0, straightBegin).multiply(
          Math.sign(stationVector.y)
        );
      }
    }

    const differenceXY = Math.abs(
      Math.abs(stationVector.normalize().x) -
        Math.abs(stationVector.normalize().y)
    );

    const needsArc =
      differenceXY > 0.02 &&
      Math.abs(stationVector.x) > Segment.minStraight + Segment.arcRadius * 2 &&
      Math.abs(stationVector.y) > Segment.minStraight + Segment.arcRadius * 2;

    this.path = this.createNewPath();

    if (needsArc) {
      const arcEnd = this.end().subtract(arcEndRel);
      const arcBegin = this.begin().add(arcBeginRel);

      const beginPoint1 = arcBegin.subtract(
        arcBeginRel.normalize().multiply(Segment.arcRadius)
      );
      const beginPoint2 = arcBegin.add(
        arcEnd.subtract(arcBegin).normalize().multiply(Segment.arcRadius)
      );
      const endPoint1 = arcEnd.subtract(
        arcEnd.subtract(arcBegin).normalize().multiply(Segment.arcRadius)
      );
      const endPoint2 = arcEnd.add(
        arcEndRel.normalize().multiply(Segment.arcRadius)
      );

      this.path.add(this.begin());
      this.path.add(beginPoint1);
      this.path.quadraticCurveTo(arcBegin, beginPoint2);
      this.path.add(endPoint1);
      this.path.quadraticCurveTo(arcEnd, endPoint2);
      this.path.add(this.end());
    } else {
      this.path.add(this.begin());
      this.path.add(this.end());
    }

    if (DisplaySettings.isDebug) {
      this.drawDebugPoints(arcBegin, arcEnd);
    }

    this.path.sendToBack();
  }

  drawDebugPoints(arcBegin, arcEnd) {
    const debugPointRadius = 4;
    const debugStyle = {
      strokeWidth: 1,
      strokeColor: "green",
      fillColor: "green",
    };

    const center = this.center();
    new paper.Path.Circle({
      center,
      radius: debugPointRadius,
      ...debugStyle,
    });

    if (arcBegin && arcEnd) {
      new paper.Path.Circle({
        center: arcBegin,
        radius: debugPointRadius,
        ...debugStyle,
      });

      new paper.Path.Circle({
        center: arcEnd,
        radius: debugPointRadius,
        ...debugStyle,
      });
    }
  }

  draw(previous, drawSettings = {}) {
    const notifyObservers = !drawSettings.fast;
    this.stationA.updatePosition(this, notifyObservers);
    this.stationB.updatePosition(this, notifyObservers);
    this.createPath(previous);

    // Update positions of intermediate stations
    this.stationsAuto.forEach((station) => {
      station.updatePosition(this, notifyObservers);
    });
  }
}

// Factory function
export function createSegment(stationA, stationB, style) {
  const segment = new Segment(stationA, stationB, style);
  Object.assign(segment, new Observable());
  return segment;
}
