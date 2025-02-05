import paper from "paper";
import { v4 as uuidv4 } from "uuid";
import { Observable } from "./util";
import { StyleUtils } from "./styles";

export class Connection extends Observable {
  constructor(stationA, stationB) {
    super();
    this.stationA = stationA;
    this.stationB = stationB;
    this.id = uuidv4();
    this.paths = [];
  }

  allPaths() {
    return this.paths;
  }

  draw() {
    // Clear existing paths
    this.paths.forEach((path) => path.remove());
    this.paths = [];

    const { stationRadius: stationRadiusA, strokeWidth: stationStrokeWidthA } =
      this.stationA.style;

    const { stationRadius: stationRadiusB, strokeWidth: stationStrokeWidthB } =
      this.stationB.style;

    // Calculate common dimensions
    const stationStrokeWidth = Math.min(
      stationStrokeWidthA,
      stationStrokeWidthB
    );
    const stationRadius = Math.min(stationRadiusA, stationRadiusB);

    // Calculate position difference
    const difference = this.stationB.position.subtract(this.stationA.position);

    // Create background rectangle
    const rectangle = new paper.Path.Rectangle({
      point: this.stationA.position.subtract(
        new paper.Point(
          -stationRadius / 2,
          stationRadius / 2 - stationStrokeWidth / 4
        )
      ),
      size: new paper.Size(
        difference.length - stationRadius,
        stationRadius - stationStrokeWidth / 2
      ),
      fillColor: "#ffffff",
      strokeWidth: 0,
    });

    rectangle.rotate(difference.angle, this.stationA.position);
    this.paths.push(rectangle);

    // Calculate connection line offsets
    const normalizedDiff = difference.normalize();
    const perpOffset = normalizedDiff.rotate(90).multiply(stationRadius / 2);

    const offsetA1 = perpOffset.add(
      normalizedDiff.multiply(stationRadiusA - stationStrokeWidthA / 2)
    );
    const offsetB1 = perpOffset.subtract(
      normalizedDiff.multiply(stationRadiusB - stationStrokeWidthB / 2)
    );
    const offsetA2 = perpOffset.subtract(
      normalizedDiff.multiply(stationRadiusA - stationStrokeWidthA / 2)
    );
    const offsetB2 = perpOffset.add(
      normalizedDiff.multiply(stationRadiusB - stationStrokeWidthB / 2)
    );

    // Create connection lines
    const createConnectionLine = (startOffset, endOffset) => {
      return new paper.Path({
        segments: [
          this.stationA.position.add(startOffset),
          this.stationB.position.add(endOffset),
        ],
        strokeColor: this.stationA.style.strokeColor,
        strokeWidth: stationStrokeWidth,
      });
    };

    this.paths.push(
      createConnectionLine(offsetA1, offsetB1),
      createConnectionLine(offsetA2.multiply(-1), offsetB2.multiply(-1))
    );
  }

  remove() {
    this.paths.forEach((path) => path.remove());
    this.paths = [];
    this.notifyBeforeRemove();
  }
}

// Factory function
export function createConnection(stationA, stationB) {
  return new Connection(stationA, stationB);
}
