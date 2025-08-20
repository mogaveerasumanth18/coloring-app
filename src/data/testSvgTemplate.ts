import type { ShapeTemplate } from '../types/shapes';

// Extracted and simplified paths from test.svg
const TEST_SVG_PATHS = {
  // Simplified character outline - main body
  mainBody:
    'M200,100 Q300,80 400,120 Q450,200 420,300 Q380,400 300,450 Q200,480 100,450 Q50,350 80,250 Q120,150 200,100 Z',

  // Head area (approximate)
  head: 'M200,50 Q250,30 300,50 Q320,80 310,110 Q300,140 250,150 Q200,140 180,110 Q170,80 200,50 Z',

  // Upper body
  upperBody:
    'M180,150 Q220,140 260,150 Q300,180 280,220 Q260,260 220,270 Q180,260 160,220 Q150,180 180,150 Z',

  // Lower body
  lowerBody:
    'M160,270 Q200,260 240,270 Q280,300 260,340 Q240,380 200,390 Q160,380 140,340 Q130,300 160,270 Z',

  // Details/accessories
  details:
    'M140,390 Q180,380 220,390 Q250,410 230,440 Q210,470 180,480 Q140,470 120,440 Q110,410 140,390 Z',
};

export const TEST_SVG_TEMPLATE: ShapeTemplate = {
  id: 'test-svg-character',
  name: 'Test Character',
  width: 400,
  height: 500,
  viewBox: '0 0 500 600',
  regions: [
    {
      id: 'character-head',
      name: 'Head',
      svgPath: TEST_SVG_PATHS.head,
    },
    {
      id: 'character-upper-body',
      name: 'Upper Body',
      svgPath: TEST_SVG_PATHS.upperBody,
    },
    {
      id: 'character-lower-body',
      name: 'Lower Body',
      svgPath: TEST_SVG_PATHS.lowerBody,
    },
    {
      id: 'character-details',
      name: 'Details',
      svgPath: TEST_SVG_PATHS.details,
    },
    {
      id: 'character-main-body',
      name: 'Main Body Outline',
      svgPath: TEST_SVG_PATHS.mainBody,
    },
  ],
  outlineElements: [
    {
      id: 'head-outline',
      type: 'path',
      svgPath: TEST_SVG_PATHS.head,
      strokeColor: '#333333',
      strokeWidth: 3,
      fill: 'none',
    },
    {
      id: 'upper-body-outline',
      type: 'path',
      svgPath: TEST_SVG_PATHS.upperBody,
      strokeColor: '#333333',
      strokeWidth: 3,
      fill: 'none',
    },
    {
      id: 'lower-body-outline',
      type: 'path',
      svgPath: TEST_SVG_PATHS.lowerBody,
      strokeColor: '#333333',
      strokeWidth: 3,
      fill: 'none',
    },
    {
      id: 'details-outline',
      type: 'path',
      svgPath: TEST_SVG_PATHS.details,
      strokeColor: '#333333',
      strokeWidth: 3,
      fill: 'none',
    },
    {
      id: 'main-body-outline',
      type: 'path',
      svgPath: TEST_SVG_PATHS.mainBody,
      strokeColor: '#666666',
      strokeWidth: 2,
      fill: 'none',
    },
  ],
};
