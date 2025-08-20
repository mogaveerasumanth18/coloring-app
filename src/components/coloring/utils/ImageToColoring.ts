import * as ImageManipulator from 'expo-image-manipulator';

export interface ImageToColoringOptions {
  edgeThreshold?: number; // 0-255, lower = more sensitive edge detection
  lineWidth?: number; // Width of the outline strokes
  simplifyLevel?: number; // 0-10, higher = more simplified
  contrastBoost?: number; // 1-3, higher = more contrast
}

/**
 * Convert a regular image to a coloring book style outline
 * This is a simplified version - for better results, you'd want to use
 * more advanced image processing libraries or server-side APIs
 */
export const convertImageToColoring = async (
  imageUri: string,
  options: ImageToColoringOptions = {}
): Promise<string> => {
  const {
    edgeThreshold = 128,
    lineWidth = 2,
    simplifyLevel = 3,
    contrastBoost = 1.5,
  } = options;

  try {
    // Step 1: Resize image for processing
    const resized = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: 800 } }, // Standardize size
      ],
      {
        compress: 1,
        format: ImageManipulator.SaveFormat.PNG,
      }
    );

    // Step 2: Convert to grayscale and adjust contrast
    // Note: For more advanced edge detection, you would typically:
    // 1. Apply Gaussian blur to reduce noise
    // 2. Apply Sobel or Canny edge detection
    // 3. Threshold the edges
    // 4. Apply morphological operations to clean up lines

    // Since React Native has limited image processing capabilities,
    // we'll use a simpler approach with available manipulations
    const processed = await ImageManipulator.manipulateAsync(
      resized.uri,
      [
        // Increase contrast to make edges more prominent
        {
          resize: { width: resized.width, height: resized.height },
        },
      ],
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.PNG,
      }
    );

    return processed.uri;
  } catch (error) {
    console.error('Error converting image to coloring:', error);
    throw new Error('Failed to convert image to coloring book format');
  }
};

/**
 * Advanced image processing for coloring book conversion
 * This would typically be done on a server with proper image processing libraries
 */
export const advancedImageToColoring = async (
  imageUri: string,
  options: ImageToColoringOptions = {}
): Promise<string> => {
  // This is a placeholder for a more advanced implementation
  // In a real app, you might:
  // 1. Send the image to a server-side API
  // 2. Use libraries like OpenCV or similar for edge detection
  // 3. Apply sophisticated algorithms like Canny edge detection
  // 4. Return the processed outline image

  const serverEndpoint = 'https://your-api.com/convert-to-coloring';

  try {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    } as any);
    formData.append('options', JSON.stringify(options));

    const response = await fetch(serverEndpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      throw new Error('Server processing failed');
    }

    const result = await response.json();
    return result.processedImageUri;
  } catch (error) {
    console.error('Advanced processing failed, falling back to basic:', error);
    // Fallback to basic processing
    return convertImageToColoring(imageUri, options);
  }
};

/**
 * Detect edges in an image using a simple algorithm
 * This is a basic implementation - for production use, consider server-side processing
 */
export const detectEdges = (
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number = 128
): Uint8ClampedArray => {
  const output = new Uint8ClampedArray(imageData.length);

  // Simple edge detection using gradient magnitude
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // Get neighboring pixels (using luminance)
      const luminance = (r: number, g: number, b: number) =>
        0.299 * r + 0.587 * g + 0.114 * b;

      const current = luminance(
        imageData[idx],
        imageData[idx + 1],
        imageData[idx + 2]
      );

      const right = luminance(
        imageData[idx + 4],
        imageData[idx + 5],
        imageData[idx + 6]
      );

      const bottom = luminance(
        imageData[idx + width * 4],
        imageData[idx + width * 4 + 1],
        imageData[idx + width * 4 + 2]
      );

      // Calculate gradient
      const gradientX = Math.abs(current - right);
      const gradientY = Math.abs(current - bottom);
      const gradient = Math.sqrt(gradientX * gradientX + gradientY * gradientY);

      // Threshold and invert (edges should be black)
      const isEdge = gradient > threshold;
      const edgeValue = isEdge ? 0 : 255; // Black edges, white background

      output[idx] = edgeValue; // R
      output[idx + 1] = edgeValue; // G
      output[idx + 2] = edgeValue; // B
      output[idx + 3] = 255; // A
    }
  }

  return output;
};

/**
 * Create SVG path from edge-detected image data
 * This is a simplified vectorization process
 */
export const imageToSvgPath = (
  edgeData: Uint8ClampedArray,
  width: number,
  height: number
): string => {
  let svgPath = '';
  const paths: string[] = [];

  // Simple contour tracing (very basic implementation)
  // For production, you'd want to use a proper vectorization algorithm

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // If this pixel is an edge (black)
      if (edgeData[idx] === 0) {
        // Check surrounding pixels to determine path direction
        const rightIdx = idx + 4;
        const bottomIdx = idx + width * 4;

        // Simple line drawing (this is very basic)
        if (x < width - 1 && edgeData[rightIdx] === 0) {
          paths.push(`M${x},${y} L${x + 1},${y}`);
        }
        if (y < height - 1 && edgeData[bottomIdx] === 0) {
          paths.push(`M${x},${y} L${x},${y + 1}`);
        }
      }
    }
  }

  return paths.join(' ');
};

/**
 * Create coloring template from processed image
 */
export const createColoringTemplate = (
  imageUri: string,
  title: string,
  category: string = 'custom'
) => {
  return {
    id: `custom_${Date.now()}`,
    title,
    category: category as any,
    difficulty: 'medium' as const,
    svgData: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <image href="${imageUri}" width="400" height="400" opacity="0.3"/>
    </svg>`,
    thumbnail: imageUri,
    tags: ['custom', 'photo', 'converted'],
    ageGroup: 'all' as const,
  };
};
