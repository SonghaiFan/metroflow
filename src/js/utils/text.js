import paper from "paper";

export function calculateTextPositions(text, station) {
  const r = station.style.stationRadius + station.style.strokeWidth;
  const w = text.bounds.width;
  const h = text.bounds.height;
  const padding = 4; // Add padding between station and text

  // Calculate more positions with different offsets and angles
  return [
    // Right side positions
    new paper.Point(r + padding, 0), // Right center
    new paper.Point(r + padding, -h / 2), // Right top
    new paper.Point(r + padding, h / 2), // Right bottom

    // Left side positions
    new paper.Point(-r - w - padding, 0), // Left center
    new paper.Point(-r - w - padding, -h / 2), // Left top
    new paper.Point(-r - w - padding, h / 2), // Left bottom

    // Top positions
    new paper.Point(-w / 2, -r - h - padding), // Top center
    new paper.Point(0, -r - h - padding), // Top center-right
    new paper.Point(-w, -r - h - padding), // Top center-left

    // Bottom positions
    new paper.Point(-w / 2, r + padding), // Bottom center
    new paper.Point(0, r + padding), // Bottom center-right
    new paper.Point(-w, r + padding), // Bottom center-left

    // Diagonal positions
    new paper.Point(r * 0.7 + padding, -r * 0.7 - h), // Top right diagonal
    new paper.Point(-r * 0.7 - w - padding, -r * 0.7 - h), // Top left diagonal
    new paper.Point(r * 0.7 + padding, r * 0.7), // Bottom right diagonal
    new paper.Point(-r * 0.7 - w - padding, r * 0.7), // Bottom left diagonal
  ];
}

export function optimizeTextPosition(text, station, paths) {
  const positions = calculateTextPositions(text, station);
  let bestPosition = positions[0];
  let minScore = Number.MAX_VALUE;

  // Get connected segments for this station
  const connectedPaths = paths.filter((path) => {
    const start = path.firstSegment.point;
    const end = path.lastSegment.point;
    const stationPos = station.position;
    const threshold = station.style.stationRadius * 2;
    return (
      start.getDistance(stationPos) < threshold ||
      end.getDistance(stationPos) < threshold
    );
  });

  positions.forEach((position) => {
    text.position = station.position.add(position);

    // Calculate score based on multiple factors
    let score = 0;

    // Factor 1: Path intersections (highest weight)
    const intersections = paths.filter((path) => text.intersects(path)).length;
    score += intersections * 1000;

    // Factor 2: Distance from connected paths (medium weight)
    connectedPaths.forEach((path) => {
      const nearestPoint = path.getNearestPoint(text.position);
      const distance = text.position.getDistance(nearestPoint);
      score += Math.max(0, 50 - distance) * 10;
    });

    // Factor 3: Prefer positions based on connected paths direction
    connectedPaths.forEach((path) => {
      const tangent = path.getTangentAt(0);
      const textVector = position.normalize();
      const alignment = Math.abs(tangent.dot(textVector));
      score += alignment * 5;
    });

    // Factor 4: Distance from station (small weight)
    const distanceFromStation = position.length;
    score += distanceFromStation * 0.1;

    // Factor 5: Prefer right side slightly (smallest weight)
    if (position.x < 0) score += 1;

    if (score < minScore) {
      minScore = score;
      bestPosition = position;
    }
  });

  // Apply the best position
  text.position = station.position.add(bestPosition);
  station.textPositionRel = bestPosition;
}

export function adjustMinorStationText(text, direction) {
  // Rotate text to match the direction of the minor station line
  const angle = Math.atan2(direction.y, direction.x);
  text.rotate((angle * 180) / Math.PI);

  // Adjust text position based on its rotation
  const textWidth = text.bounds.width;
  const offset = direction.multiply(textWidth / 2);
  text.position = text.position.add(offset);

  // Ensure text is always readable from left to right
  if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
    text.rotate(180);
  }
}
