import paper from "paper";

// Cache for storing validated text positions
const textPositionCache = new Map();

export function calculateTextPositions(text, station) {
  const r = station.style.stationRadius + station.style.strokeWidth;
  const w = text.bounds.width;
  const h = text.bounds.height;
  const padding = 6; // Increased padding

  // Return cached positions if available
  const cacheKey = `${station.id}-${w}-${h}`;
  if (textPositionCache.has(cacheKey)) {
    return textPositionCache.get(cacheKey);
  }

  // Calculate vertical offsets considering text height
  const topOffset = -r - h - padding;
  const bottomOffset = r + h / 2 + padding;
  const centerYOffset = padding;

  const positions = [
    // Primary positions in order of preference
    new paper.Point(r + padding, centerYOffset), // Right center (preferred)
    new paper.Point(-w / 2, bottomOffset), // Bottom center
    new paper.Point(-r - w - padding, centerYOffset), // Left center
    new paper.Point(-w / 2, topOffset), // Top center (last resort)

    // Additional positions for complex cases
    new paper.Point(r + padding, bottomOffset), // Bottom right
    new paper.Point(-r - w - padding, bottomOffset), // Bottom left
    new paper.Point(r + padding, topOffset), // Top right
    new paper.Point(-r - w - padding, topOffset), // Top left
  ];

  // Cache the positions
  textPositionCache.set(cacheKey, positions);
  return positions;
}

function checkPathIntersection(text, path) {
  // Create a slightly expanded bounds for the path to account for stroke width
  const pathBounds = path.strokeBounds;
  const expandedBounds = pathBounds.expand(4); // Add small buffer

  // Quick bounds check first
  if (!text.bounds.intersects(expandedBounds)) {
    return false;
  }

  // If bounds intersect, do a more precise check
  return text.intersects(path);
}

export function optimizeTextPosition(text, station, paths, allStations = []) {
  // Try to use cached position first
  if (station.textPositionRel) {
    text.position = station.position.add(station.textPositionRel);
    // Check for intersections with paths
    const hasPathIntersection = paths.some((path) => text.intersects(path));

    // Check intersection with other station texts
    const hasTextIntersection =
      allStations.length > 0 &&
      allStations.some((otherStation) => {
        if (otherStation === station || !otherStation.textElement) return false;
        return text.intersects(otherStation.textElement);
      });

    if (!hasPathIntersection && !hasTextIntersection) {
      return;
    }
  }

  const positions = calculateTextPositions(text, station);

  // Get only nearby paths for intersection testing
  const connectedPaths = paths.filter((path) => {
    const start = path.firstSegment.point;
    const end = path.lastSegment.point;
    const stationPos = station.position;
    const threshold = station.style.stationRadius * 4; // Increased threshold
    return (
      start.getDistance(stationPos) < threshold ||
      end.getDistance(stationPos) < threshold
    );
  });

  // Get nearby station texts
  const nearbyTexts =
    allStations.length > 0
      ? allStations.filter((otherStation) => {
          if (otherStation === station || !otherStation.textElement)
            return false;
          const distance = otherStation.position.getDistance(station.position);
          return distance < station.style.stationRadius * 8;
        })
      : [];

  // Try each position
  positionLoop: for (const position of positions) {
    text.position = station.position.add(position);

    // Check path intersections with improved detection
    const hasPathIntersection = connectedPaths.some((path) =>
      checkPathIntersection(text, path)
    );
    if (hasPathIntersection) continue;

    // Check text intersections
    const hasTextIntersection =
      nearbyTexts.length > 0 &&
      nearbyTexts.some((otherStation) =>
        text.intersects(otherStation.textElement)
      );

    if (!hasTextIntersection) {
      station.textPositionRel = position;
      return;
    }
  }

  // Try positions with increased spacing
  for (const position of positions) {
    const adjustedPosition = position.multiply(1.5);
    text.position = station.position.add(adjustedPosition);

    const hasPathIntersection = connectedPaths.some((path) =>
      checkPathIntersection(text, path)
    );
    if (hasPathIntersection) continue;

    const hasTextIntersection =
      nearbyTexts.length > 0 &&
      nearbyTexts.some((otherStation) =>
        text.intersects(otherStation.textElement)
      );

    if (!hasTextIntersection) {
      station.textPositionRel = adjustedPosition;
      return;
    }
  }

  // Fallback with slight padding
  const fallbackPosition = positions[0].multiply(1.2);
  text.position = station.position.add(fallbackPosition);
  station.textPositionRel = fallbackPosition;
}

// Clear cache when needed (e.g., on style changes)
export function clearTextPositionCache() {
  textPositionCache.clear();
}

export function adjustMinorStationText(text, direction) {
  // Get the base position offset from the marker
  const markerSize = text.style.minorStationSize || 4;
  const baseOffset = direction.multiply(markerSize * 1.2);
  text.position = text.position.add(baseOffset);

  // Adjust position based on line direction
  if (direction.x < 0) {
    // For lines going left, shift text left by its width
    text.position = text.position.add(new paper.Point(-text.bounds.width, 0));
  }

  if (direction.y > 0.01) {
    // For lines going down, shift text down by portion of its height
    text.position = text.position.add(
      new paper.Point(0, text.bounds.height / 1.2)
    );
  } else if (direction.y < -0.01) {
    // For lines going up, shift text up by portion of its height
    text.position = text.position.add(
      new paper.Point(0, -text.bounds.height / 1.2)
    );
  }

  // No need to rotate text - keep it horizontal for better readability
}
