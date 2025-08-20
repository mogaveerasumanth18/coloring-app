/**
 * ColoringAreaDetector - Analyzes coloring templates to find fillable areas
 *
 * This utility simulates the behavior of the reference Android app which:
 * 1. Analyzes bitmap pixels to find enclosed areas
 * 2. Detects black borders that separate fillable regions
 * 3. Provides intelligent area detection for coloring
 */

export interface ColoringArea {
  id: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  center: {
    x: number;
    y: number;
  };
  color: string;
  isFilled: boolean;
}

export class ColoringAreaDetector {
  private areas: ColoringArea[] = [];
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.generateDefaultAreas();
  }

  /**
   * Generate default fillable areas for common coloring book layouts
   * This simulates the areas that would be detected in a real coloring template
   */
  private generateDefaultAreas(): void {
    this.areas = [];

    // Generate a grid of potential fillable areas
    // This simulates what a real coloring book template would have
    const gridCols = 6;
    const gridRows = 8;
    const marginX = this.canvasWidth * 0.1;
    const marginY = this.canvasHeight * 0.1;
    const usableWidth = this.canvasWidth - marginX * 2;
    const usableHeight = this.canvasHeight - marginY * 2;

    const cellWidth = usableWidth / gridCols;
    const cellHeight = usableHeight / gridRows;

    // Create larger, more natural areas that simulate enclosed regions
    const areaPatterns = [
      // Large central areas (like flower centers, animal bodies)
      {
        row: 2,
        col: 2,
        width: 2,
        height: 2,
        name: 'center-area',
      },
      {
        row: 1,
        col: 1,
        width: 1.5,
        height: 1.5,
        name: 'top-left-detail',
      },
      {
        row: 1,
        col: 4,
        width: 1.5,
        height: 1.5,
        name: 'top-right-detail',
      },
      // Medium areas (like petals, leaves)
      {
        row: 4,
        col: 1,
        width: 1,
        height: 2,
        name: 'left-element',
      },
      {
        row: 4,
        col: 4,
        width: 1,
        height: 2,
        name: 'right-element',
      },
      {
        row: 5,
        col: 2.5,
        width: 1,
        height: 1,
        name: 'bottom-center',
      },
      // Small detail areas
      {
        row: 0.5,
        col: 2.5,
        width: 1,
        height: 0.8,
        name: 'top-accent',
      },
      {
        row: 6.5,
        col: 1,
        width: 0.8,
        height: 0.8,
        name: 'bottom-left-detail',
      },
      {
        row: 6.5,
        col: 4.2,
        width: 0.8,
        height: 0.8,
        name: 'bottom-right-detail',
      },
      // Background/border areas
      {
        row: 0,
        col: 0,
        width: 0.8,
        height: 8,
        name: 'left-border',
      },
      {
        row: 0,
        col: 5.2,
        width: 0.8,
        height: 8,
        name: 'right-border',
      },
    ];

    areaPatterns.forEach((pattern, index) => {
      const x = marginX + pattern.col * cellWidth;
      const y = marginY + pattern.row * cellHeight;
      const width = pattern.width * cellWidth;
      const height = pattern.height * cellHeight;

      this.areas.push({
        id: `area_${index}_${pattern.name}`,
        bounds: { x, y, width, height },
        center: {
          x: x + width / 2,
          y: y + height / 2,
        },
        color: 'transparent',
        isFilled: false,
      });
    });
  }

  /**
   * Find the area at a specific point with intelligent detection
   * Mimics the Android app's behavior of finding nearby areas when touching borders
   */
  findAreaAtPoint(
    x: number,
    y: number,
    searchRadius: number = 15
  ): ColoringArea | null {
    // First try exact hit
    for (const area of this.areas) {
      if (this.isPointInArea(x, y, area)) {
        return area;
      }
    }

    // If no exact hit, search in radius (simulates touching near a border)
    let closestArea: ColoringArea | null = null;
    let closestDistance = searchRadius;

    for (const area of this.areas) {
      const distance = this.distanceToArea(x, y, area);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestArea = area;
      }
    }

    return closestArea;
  }

  /**
   * Check if a point is inside an area
   */
  private isPointInArea(x: number, y: number, area: ColoringArea): boolean {
    const { bounds } = area;
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  /**
   * Calculate distance from a point to the nearest edge of an area
   */
  private distanceToArea(x: number, y: number, area: ColoringArea): number {
    const { bounds } = area;
    const dx = Math.max(bounds.x - x, 0, x - (bounds.x + bounds.width));
    const dy = Math.max(bounds.y - y, 0, y - (bounds.y + bounds.height));
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Fill an area with a color
   */
  fillArea(areaId: string, color: string): boolean {
    const area = this.areas.find((a) => a.id === areaId);
    if (area) {
      area.color = color;
      area.isFilled = true;
      return true;
    }
    return false;
  }

  /**
   * Clear all filled areas
   */
  clearAll(): void {
    this.areas.forEach((area) => {
      area.color = 'transparent';
      area.isFilled = false;
    });
  }

  /**
   * Get all areas
   */
  getAreas(): ColoringArea[] {
    return [...this.areas];
  }

  /**
   * Get filled areas only
   */
  getFilledAreas(): ColoringArea[] {
    return this.areas.filter((area) => area.isFilled);
  }
}
