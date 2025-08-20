// Flood fill algorithm for bucket fill functionality
export interface Point {
  x: number;
  y: number;
}

export interface FloodFillOptions {
  tolerance: number; // Color tolerance for fill (0-255)
  fillColor: string;
  targetColor?: string;
}

// Convert hex color to RGB
export const hexToRgb = (
  hex: string
): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Convert RGB to hex
export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Calculate color difference
export const colorDistance = (
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number => {
  const rDiff = color1.r - color2.r;
  const gDiff = color1.g - color2.g;
  const bDiff = color1.b - color2.b;
  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
};

// Flood fill algorithm using stack-based approach
export const floodFill = (
  imageData: ImageData,
  startPoint: Point,
  options: FloodFillOptions
): ImageData => {
  const { tolerance, fillColor } = options;
  const { width, height, data } = imageData;

  // Boundary checks
  if (
    startPoint.x < 0 ||
    startPoint.x >= width ||
    startPoint.y < 0 ||
    startPoint.y >= height
  ) {
    return imageData;
  }

  const fillRgb = hexToRgb(fillColor);
  if (!fillRgb) return imageData;

  // Get the color at the starting point
  const startIndex = (startPoint.y * width + startPoint.x) * 4;
  const targetColor = {
    r: data[startIndex],
    g: data[startIndex + 1],
    b: data[startIndex + 2],
  };

  // If the target color is the same as fill color, no need to fill
  if (colorDistance(targetColor, fillRgb) <= tolerance) {
    return imageData;
  }

  const newImageData = new ImageData(
    new Uint8ClampedArray(data),
    width,
    height
  );
  const newData = newImageData.data;

  // Stack for flood fill algorithm
  const stack: Point[] = [startPoint];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const currentPoint = stack.pop()!;
    const key = `${currentPoint.x},${currentPoint.y}`;

    if (visited.has(key)) continue;
    visited.add(key);

    const { x, y } = currentPoint;

    // Boundary checks
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const pixelIndex = (y * width + x) * 4;
    const pixelColor = {
      r: newData[pixelIndex],
      g: newData[pixelIndex + 1],
      b: newData[pixelIndex + 2],
    };

    // Check if the pixel color matches the target color within tolerance
    if (colorDistance(pixelColor, targetColor) <= tolerance) {
      // Fill the pixel
      newData[pixelIndex] = fillRgb.r;
      newData[pixelIndex + 1] = fillRgb.g;
      newData[pixelIndex + 2] = fillRgb.b;
      newData[pixelIndex + 3] = 255; // Alpha

      // Add neighboring pixels to the stack
      stack.push({ x: x + 1, y });
      stack.push({ x: x - 1, y });
      stack.push({ x, y: y + 1 });
      stack.push({ x, y: y - 1 });
    }
  }

  return newImageData;
};

// Create a bounded flood fill that respects line boundaries
export const boundedFloodFill = (
  imageData: ImageData,
  startPoint: Point,
  options: FloodFillOptions,
  boundaryColors: string[] = ['#000000'] // Default boundary is black lines
): ImageData => {
  const { tolerance, fillColor } = options;
  const { width, height, data } = imageData;

  if (
    startPoint.x < 0 ||
    startPoint.x >= width ||
    startPoint.y < 0 ||
    startPoint.y >= height
  ) {
    return imageData;
  }

  const fillRgb = hexToRgb(fillColor);
  if (!fillRgb) return imageData;

  // Convert boundary colors to RGB
  const boundaryRgbColors = boundaryColors
    .map(hexToRgb)
    .filter(
      (color): color is { r: number; g: number; b: number } => color !== null
    );

  const startIndex = (startPoint.y * width + startPoint.x) * 4;
  const targetColor = {
    r: data[startIndex],
    g: data[startIndex + 1],
    b: data[startIndex + 2],
  };

  // Check if starting point is a boundary color
  const isStartBoundary = boundaryRgbColors.some(
    (boundaryColor) => colorDistance(targetColor, boundaryColor) <= tolerance
  );

  if (isStartBoundary) return imageData;

  // If target color is same as fill color, no need to fill
  if (colorDistance(targetColor, fillRgb) <= tolerance) {
    return imageData;
  }

  const newImageData = new ImageData(
    new Uint8ClampedArray(data),
    width,
    height
  );
  const newData = newImageData.data;

  const stack: Point[] = [startPoint];
  const visited = new Set<string>();

  const isBoundaryColor = (pixelColor: {
    r: number;
    g: number;
    b: number;
  }): boolean => {
    return boundaryRgbColors.some(
      (boundaryColor) => colorDistance(pixelColor, boundaryColor) <= tolerance
    );
  };

  while (stack.length > 0) {
    const currentPoint = stack.pop()!;
    const key = `${currentPoint.x},${currentPoint.y}`;

    if (visited.has(key)) continue;
    visited.add(key);

    const { x, y } = currentPoint;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const pixelIndex = (y * width + x) * 4;
    const pixelColor = {
      r: newData[pixelIndex],
      g: newData[pixelIndex + 1],
      b: newData[pixelIndex + 2],
    };

    // Don't fill boundary colors
    if (isBoundaryColor(pixelColor)) continue;

    // Check if pixel color matches target color within tolerance
    if (colorDistance(pixelColor, targetColor) <= tolerance) {
      // Fill the pixel
      newData[pixelIndex] = fillRgb.r;
      newData[pixelIndex + 1] = fillRgb.g;
      newData[pixelIndex + 2] = fillRgb.b;
      newData[pixelIndex + 3] = 255;

      // Add neighboring pixels
      stack.push({ x: x + 1, y });
      stack.push({ x: x - 1, y });
      stack.push({ x, y: y + 1 });
      stack.push({ x, y: y - 1 });
    }
  }

  return newImageData;
};
