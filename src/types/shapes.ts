export interface ColorableRegion {
  id: string;
  name: string;
  svgPath: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface ShapeTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  viewBox: string;
  regions: ColorableRegion[];
  outlineElements?: OutlineElement[];
}

export interface OutlineElement {
  id: string;
  type: 'path' | 'circle' | 'rect' | 'polygon';
  svgPath?: string;
  points?: string;
  cx?: number;
  cy?: number;
  r?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  fill?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  type: 'brush' | 'fill';
  regionId?: string;
  points: Point[];
  color: string;
  width: number;
  pathData: string;
}
