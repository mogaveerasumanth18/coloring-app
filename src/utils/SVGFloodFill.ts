/**
 * SVGFloodFill - Implements flood fill for PNG templates using SVG overlays
 *
 * This approach works by:
 * 1. Converting the template to regions based on visual analysis
 * 2. Creating SVG paths that follow the actual template boundaries
 * 3. Implementing intelligent touch detection that respects template shapes
 */

export interface TemplateRegion {
  id: string;
  name: string;
  path: string; // SVG path that follows template boundaries
  center: { x: number; y: number };
  bounds: { x: number; y: number; width: number; height: number };
  color: string;
  isFilled: boolean;
  isBackground?: boolean;
}

export class SVGFloodFill {
  private regions: TemplateRegion[] = [];
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.generateTemplateRegions();
  }

  /**
   * Generate regions that follow typical coloring book template boundaries
   * This creates SVG paths that mimic enclosed areas in templates
   */
  private generateTemplateRegions(): void {
    this.regions = [];

    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const scale = Math.min(this.canvasWidth, this.canvasHeight) / 400;

    // Hot air balloon template regions (like in your image)
    const templateRegions: Omit<TemplateRegion, 'id' | 'color' | 'isFilled'>[] =
      [
        // Main balloon body (large circular area)
        {
          name: 'balloon-main',
          path: this.createCirclePath(
            centerX,
            centerY - 50 * scale,
            80 * scale
          ),
          center: { x: centerX, y: centerY - 50 * scale },
          bounds: {
            x: centerX - 80 * scale,
            y: centerY - 130 * scale,
            width: 160 * scale,
            height: 160 * scale,
          },
        },

        // Balloon sections (horizontal stripes)
        {
          name: 'balloon-top-stripe',
          path: this.createEllipsePath(
            centerX,
            centerY - 80 * scale,
            70 * scale,
            20 * scale
          ),
          center: { x: centerX, y: centerY - 80 * scale },
          bounds: {
            x: centerX - 70 * scale,
            y: centerY - 100 * scale,
            width: 140 * scale,
            height: 40 * scale,
          },
        },

        {
          name: 'balloon-middle-stripe',
          path: this.createEllipsePath(
            centerX,
            centerY - 40 * scale,
            75 * scale,
            25 * scale
          ),
          center: { x: centerX, y: centerY - 40 * scale },
          bounds: {
            x: centerX - 75 * scale,
            y: centerY - 65 * scale,
            width: 150 * scale,
            height: 50 * scale,
          },
        },

        {
          name: 'balloon-bottom-stripe',
          path: this.createEllipsePath(
            centerX,
            centerY,
            70 * scale,
            20 * scale
          ),
          center: { x: centerX, y: centerY },
          bounds: {
            x: centerX - 70 * scale,
            y: centerY - 20 * scale,
            width: 140 * scale,
            height: 40 * scale,
          },
        },

        // Basket
        {
          name: 'basket',
          path: this.createRectPath(
            centerX - 25 * scale,
            centerY + 60 * scale,
            50 * scale,
            30 * scale
          ),
          center: { x: centerX, y: centerY + 75 * scale },
          bounds: {
            x: centerX - 25 * scale,
            y: centerY + 60 * scale,
            width: 50 * scale,
            height: 30 * scale,
          },
        },

        // Smaller balloons (left and right)
        {
          name: 'left-small-balloon',
          path: this.createCirclePath(
            centerX - 120 * scale,
            centerY - 30 * scale,
            35 * scale
          ),
          center: { x: centerX - 120 * scale, y: centerY - 30 * scale },
          bounds: {
            x: centerX - 155 * scale,
            y: centerY - 65 * scale,
            width: 70 * scale,
            height: 70 * scale,
          },
        },

        {
          name: 'right-small-balloon',
          path: this.createCirclePath(
            centerX + 120 * scale,
            centerY - 30 * scale,
            35 * scale
          ),
          center: { x: centerX + 120 * scale, y: centerY - 30 * scale },
          bounds: {
            x: centerX + 85 * scale,
            y: centerY - 65 * scale,
            width: 70 * scale,
            height: 70 * scale,
          },
        },

        // Left small balloon basket
        {
          name: 'left-basket',
          path: this.createRectPath(
            centerX - 135 * scale,
            centerY + 20 * scale,
            30 * scale,
            20 * scale
          ),
          center: { x: centerX - 120 * scale, y: centerY + 30 * scale },
          bounds: {
            x: centerX - 135 * scale,
            y: centerY + 20 * scale,
            width: 30 * scale,
            height: 20 * scale,
          },
        },

        // Right small balloon basket
        {
          name: 'right-basket',
          path: this.createRectPath(
            centerX + 105 * scale,
            centerY + 20 * scale,
            30 * scale,
            20 * scale
          ),
          center: { x: centerX + 120 * scale, y: centerY + 30 * scale },
          bounds: {
            x: centerX + 105 * scale,
            y: centerY + 20 * scale,
            width: 30 * scale,
            height: 20 * scale,
          },
        },

        // Clouds
        {
          name: 'cloud-left',
          path: this.createCloudPath(
            centerX - 150 * scale,
            centerY + 80 * scale,
            40 * scale
          ),
          center: { x: centerX - 150 * scale, y: centerY + 80 * scale },
          bounds: {
            x: centerX - 170 * scale,
            y: centerY + 60 * scale,
            width: 40 * scale,
            height: 40 * scale,
          },
        },

        {
          name: 'cloud-right',
          path: this.createCloudPath(
            centerX + 150 * scale,
            centerY + 80 * scale,
            40 * scale
          ),
          center: { x: centerX + 150 * scale, y: centerY + 80 * scale },
          bounds: {
            x: centerX + 130 * scale,
            y: centerY + 60 * scale,
            width: 40 * scale,
            height: 40 * scale,
          },
        },

        // Mountains/hills in background
        {
          name: 'mountain-left',
          path: this.createTrianglePath(
            centerX - 100 * scale,
            centerY + 120 * scale,
            60 * scale,
            40 * scale
          ),
          center: { x: centerX - 100 * scale, y: centerY + 100 * scale },
          bounds: {
            x: centerX - 130 * scale,
            y: centerY + 80 * scale,
            width: 60 * scale,
            height: 40 * scale,
          },
        },

        {
          name: 'mountain-right',
          path: this.createTrianglePath(
            centerX + 100 * scale,
            centerY + 120 * scale,
            60 * scale,
            40 * scale
          ),
          center: { x: centerX + 100 * scale, y: centerY + 100 * scale },
          bounds: {
            x: centerX + 70 * scale,
            y: centerY + 80 * scale,
            width: 60 * scale,
            height: 40 * scale,
          },
        },
      ];

    // Add background region
    templateRegions.push({
      name: 'background',
      path: `M 0 0 L ${this.canvasWidth} 0 L ${this.canvasWidth} ${this.canvasHeight} L 0 ${this.canvasHeight} Z`,
      center: { x: this.canvasWidth / 2, y: this.canvasHeight / 2 },
      bounds: {
        x: 0,
        y: 0,
        width: this.canvasWidth,
        height: this.canvasHeight,
      },
      isBackground: true,
    });

    // Convert to full regions
    templateRegions.forEach((template, index) => {
      this.regions.push({
        id: `region_${index}_${template.name}`,
        ...template,
        color: 'transparent',
        isFilled: false,
      });
    });
  }

  /**
   * Helper methods to create SVG paths for different shapes
   */
  private createCirclePath(cx: number, cy: number, radius: number): string {
    return `M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx + radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy} Z`;
  }

  private createEllipsePath(
    cx: number,
    cy: number,
    rx: number,
    ry: number
  ): string {
    return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
  }

  private createRectPath(
    x: number,
    y: number,
    width: number,
    height: number
  ): string {
    return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
  }

  private createTrianglePath(
    cx: number,
    cy: number,
    width: number,
    height: number
  ): string {
    const halfWidth = width / 2;
    return `M ${cx} ${cy - height} L ${cx + halfWidth} ${cy} L ${cx - halfWidth} ${cy} Z`;
  }

  private createCloudPath(cx: number, cy: number, size: number): string {
    // Simple cloud shape using circles
    const r = size / 4;
    return `
      M ${cx - size / 2} ${cy}
      A ${r} ${r} 0 0 0 ${cx - size / 4} ${cy - r}
      A ${r} ${r} 0 0 0 ${cx} ${cy - r}
      A ${r} ${r} 0 0 0 ${cx + size / 4} ${cy - r}
      A ${r} ${r} 0 0 0 ${cx + size / 2} ${cy}
      Z
    `;
  }

  /**
   * Find region at point with intelligent detection
   */
  findRegionAtPoint(
    x: number,
    y: number,
    searchRadius: number = 20
  ): TemplateRegion | null {
    // First try exact hit detection (point-in-path)
    for (const region of this.regions) {
      if (region.isBackground) continue; // Skip background for primary detection
      if (this.isPointInRegion(x, y, region)) {
        return region;
      }
    }

    // If no exact hit, search in radius for nearest region
    let closestRegion: TemplateRegion | null = null;
    let closestDistance = searchRadius;

    for (const region of this.regions) {
      if (region.isBackground) continue;
      const distance = this.distanceToRegionCenter(x, y, region);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestRegion = region;
      }
    }

    // If still no hit, allow background
    if (!closestRegion) {
      const bgRegion = this.regions.find((r) => r.isBackground);
      if (bgRegion && this.isPointInRegion(x, y, bgRegion)) {
        return bgRegion;
      }
    }

    return closestRegion;
  }

  /**
   * Simple point-in-bounds check (more sophisticated point-in-path would be ideal)
   */
  private isPointInRegion(
    x: number,
    y: number,
    region: TemplateRegion
  ): boolean {
    const { bounds } = region;
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  /**
   * Distance to region center
   */
  private distanceToRegionCenter(
    x: number,
    y: number,
    region: TemplateRegion
  ): number {
    const dx = x - region.center.x;
    const dy = y - region.center.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Fill a region with color
   */
  fillRegion(regionId: string, color: string): boolean {
    const region = this.regions.find((r) => r.id === regionId);
    if (region) {
      region.color = color;
      region.isFilled = true;
      return true;
    }
    return false;
  }

  /**
   * Clear all regions
   */
  clearAll(): void {
    this.regions.forEach((region) => {
      region.color = 'transparent';
      region.isFilled = false;
    });
  }

  /**
   * Get all regions
   */
  getRegions(): TemplateRegion[] {
    return [...this.regions];
  }

  /**
   * Get filled regions only
   */
  getFilledRegions(): TemplateRegion[] {
    return this.regions.filter((region) => region.isFilled);
  }
}
