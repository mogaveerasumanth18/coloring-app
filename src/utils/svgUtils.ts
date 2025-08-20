import type { Point } from '../types/shapes';

/**
 * Check if a point is inside an SVG path using ray casting algorithm
 * This is a simplified version - for production, consider using a more robust library
 */
export const isPointInSVGPath = (
  x: number,
  y: number,
  pathData: string
): boolean => {
  // For now, we'll create a simplified path-in-polygon test
  // In a real app, you'd want to use a library like 'point-in-svg-polygon'
  // or implement a more sophisticated path parsing and hit-testing

  try {
    // This is a basic implementation for simple paths
    // For complex curves, you'd need more sophisticated algorithms
    const points = parseSVGPathToPoints(pathData);
    return isPointInPolygon(x, y, points);
  } catch (error) {
    console.warn('Error checking point in path:', error);
    return false;
  }
};

/**
 * Parse simple SVG path data to points (basic implementation)
 * This handles M (move), L (line), Z (close) commands
 */
export const parseSVGPathToPoints = (pathData: string): Point[] => {
  const points: Point[] = [];
  const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];

  let currentX = 0;
  let currentY = 0;

  commands.forEach((command) => {
    const type = command[0].toUpperCase();
    const values = command
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !isNaN(n));

    switch (type) {
      case 'M': // Move to
        if (values.length >= 2) {
          currentX = values[0];
          currentY = values[1];
          points.push({ x: currentX, y: currentY });
        }
        break;
      case 'L': // Line to
        if (values.length >= 2) {
          currentX = values[0];
          currentY = values[1];
          points.push({ x: currentX, y: currentY });
        }
        break;
      case 'Q': // Quadratic curve - approximate with points
        if (values.length >= 4) {
          const controlX = values[0];
          const controlY = values[1];
          const endX = values[2];
          const endY = values[3];

          // Add some points along the curve
          for (let t = 0.2; t <= 1; t += 0.2) {
            const x =
              Math.pow(1 - t, 2) * currentX +
              2 * (1 - t) * t * controlX +
              Math.pow(t, 2) * endX;
            const y =
              Math.pow(1 - t, 2) * currentY +
              2 * (1 - t) * t * controlY +
              Math.pow(t, 2) * endY;
            points.push({ x, y });
          }

          currentX = endX;
          currentY = endY;
        }
        break;
      case 'Z': // Close path
        if (points.length > 0) {
          points.push(points[0]); // Close the shape
        }
        break;
    }
  });

  return points;
};

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export const isPointInPolygon = (
  x: number,
  y: number,
  polygon: Point[]
): boolean => {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
};

/**
 * Get the bounding box of an SVG path
 */
export const getPathBoundingBox = (pathData: string) => {
  const points = parseSVGPathToPoints(pathData);

  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

/**
 * Scale an SVG path to fit within given dimensions
 */
export const scalePathToFit = (
  pathData: string,
  targetWidth: number,
  targetHeight: number,
  padding: number = 20
): string => {
  const bbox = getPathBoundingBox(pathData);

  if (bbox.width === 0 || bbox.height === 0) return pathData;

  const availableWidth = targetWidth - padding * 2;
  const availableHeight = targetHeight - padding * 2;

  const scaleX = availableWidth / bbox.width;
  const scaleY = availableHeight / bbox.height;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = padding + (availableWidth - bbox.width * scale) / 2;
  const offsetY = padding + (availableHeight - bbox.height * scale) / 2;

  // Apply transform to the path
  return pathData.replace(
    /([ML])\s*([0-9.-]+)\s*,?\s*([0-9.-]+)/g,
    (match, command, x, y) => {
      const newX = (parseFloat(x) - bbox.minX) * scale + offsetX;
      const newY = (parseFloat(y) - bbox.minY) * scale + offsetY;
      return `${command}${newX},${newY}`;
    }
  );
};
