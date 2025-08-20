import type { ShapeTemplate } from '../types/shapes';
import { TEST_SVG_TEMPLATE } from './testSvgTemplate';

export const SHAPE_TEMPLATES: ShapeTemplate[] = [
  // Add the test SVG template first
  TEST_SVG_TEMPLATE,
  {
    id: 'simple-triangle',
    name: 'Triangle',
    width: 300,
    height: 220,
    viewBox: '0 0 300 220',
    regions: [
      {
        id: 'triangle-main',
        name: 'Triangle',
        svgPath: 'M150,30 L260,190 L40,190 Z',
      },
    ],
    outlineElements: [
      {
        id: 'triangle-outline',
        type: 'path',
        svgPath: 'M150,30 L260,190 L40,190 Z',
        strokeColor: '#333333',
        strokeWidth: 4,
        fill: 'none',
      },
    ],
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    width: 400,
    height: 300,
    viewBox: '0 0 400 300',
    regions: [
      {
        id: 'left-wing',
        name: 'Left Wing',
        svgPath: 'M200,150 Q120,80 80,120 Q60,160 100,200 Q160,180 200,150 Z',
      },
      {
        id: 'right-wing',
        name: 'Right Wing',
        svgPath: 'M200,150 Q280,80 320,120 Q340,160 300,200 Q240,180 200,150 Z',
      },
      {
        id: 'body',
        name: 'Body',
        svgPath:
          'M200,50 Q210,100 200,150 Q190,200 200,250 Q210,200 200,150 Q190,100 200,50 Z',
      },
    ],
    outlineElements: [
      {
        id: 'left-wing-outline',
        type: 'path',
        svgPath: 'M200,150 Q120,80 80,120 Q60,160 100,200 Q160,180 200,150 Z',
        strokeColor: '#333',
        strokeWidth: 3,
        fill: 'none',
      },
      {
        id: 'right-wing-outline',
        type: 'path',
        svgPath: 'M200,150 Q280,80 320,120 Q340,160 300,200 Q240,180 200,150 Z',
        strokeColor: '#333',
        strokeWidth: 3,
        fill: 'none',
      },
      {
        id: 'body-outline',
        type: 'path',
        svgPath:
          'M200,50 Q210,100 200,150 Q190,200 200,250 Q210,200 200,150 Q190,100 200,50 Z',
        strokeColor: '#333',
        strokeWidth: 3,
        fill: 'none',
      },
    ],
  },
  {
    id: 'flower',
    name: 'Flower',
    width: 350,
    height: 350,
    viewBox: '0 0 350 350',
    regions: [
      {
        id: 'center',
        name: 'Center',
        svgPath: 'M175,175 m-25,0 a25,25 0 1,0 50,0 a25,25 0 1,0 -50,0',
      },
      {
        id: 'petal-1',
        name: 'Petal 1',
        svgPath: 'M175,175 Q175,125 175,75 Q200,100 225,125 Q200,150 175,175 Z',
      },
      {
        id: 'petal-2',
        name: 'Petal 2',
        svgPath:
          'M175,175 Q225,175 275,175 Q250,150 225,125 Q200,150 175,175 Z',
      },
      {
        id: 'petal-3',
        name: 'Petal 3',
        svgPath:
          'M175,175 Q175,225 175,275 Q150,250 125,225 Q150,200 175,175 Z',
      },
      {
        id: 'petal-4',
        name: 'Petal 4',
        svgPath: 'M175,175 Q125,175 75,175 Q100,200 125,225 Q150,200 175,175 Z',
      },
    ],
    outlineElements: [
      {
        id: 'center-outline',
        type: 'circle',
        cx: 175,
        cy: 175,
        r: 25,
        strokeColor: '#333',
        strokeWidth: 3,
        fill: 'none',
      },
      {
        id: 'petal-1-outline',
        type: 'path',
        svgPath: 'M175,175 Q175,125 175,75 Q200,100 225,125 Q200,150 175,175 Z',
        strokeColor: '#333',
        strokeWidth: 3,
        fill: 'none',
      },
      {
        id: 'petal-2-outline',
        type: 'path',
        svgPath:
          'M175,175 Q225,175 275,175 Q250,150 225,125 Q200,150 175,175 Z',
        strokeColor: '#333',
        strokeWidth: 3,
        fill: 'none',
      },
      {
        id: 'petal-3-outline',
        type: 'path',
        svgPath:
          'M175,175 Q175,225 175,275 Q150,250 125,225 Q150,200 175,175 Z',
        strokeColor: '#333',
        strokeWidth: 3,
        fill: 'none',
      },
      {
        id: 'petal-4-outline',
        type: 'path',
        svgPath: 'M175,175 Q125,175 75,175 Q100,200 125,225 Q150,200 175,175 Z',
        strokeColor: '#333',
        strokeWidth: 3,
        fill: 'none',
      },
    ],
  },
  {
    id: 'house',
    name: 'House',
    width: 400,
    height: 300,
    viewBox: '0 0 400 300',
    regions: [
      {
        id: 'roof',
        name: 'Roof',
        svgPath: 'M200,50 L350,150 L50,150 Z',
      },
      {
        id: 'wall',
        name: 'Wall',
        svgPath: 'M50,150 L350,150 L350,250 L50,250 Z',
      },
      {
        id: 'door',
        name: 'Door',
        svgPath: 'M160,180 L240,180 L240,250 L160,250 Z',
      },
      {
        id: 'window',
        name: 'Window',
        svgPath: 'M280,180 L340,180 L340,220 L280,220 Z',
      },
    ],
    outlineElements: [
      {
        id: 'roof-outline',
        type: 'path',
        svgPath: 'M200,50 L350,150 L50,150 Z',
        strokeColor: '#333',
        strokeWidth: 3,
        fill: 'none',
      },
      {
        id: 'wall-outline',
        type: 'rect',
        x: 50,
        y: 150,
        width: 300,
        height: 100,
        strokeColor: '#333',
        strokeWidth: 3,
        fill: 'none',
      },
      {
        id: 'door-outline',
        type: 'rect',
        x: 160,
        y: 180,
        width: 80,
        height: 70,
        strokeColor: '#333',
        strokeWidth: 3,
        fill: 'none',
      },
      {
        id: 'window-outline',
        type: 'rect',
        x: 280,
        y: 180,
        width: 60,
        height: 40,
        strokeColor: '#333',
        strokeWidth: 3,
        fill: 'none',
      },
    ],
  },
];
