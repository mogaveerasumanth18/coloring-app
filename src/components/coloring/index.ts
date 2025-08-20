// Main Components
export { ColoringBookScreen } from './ColoringBookScreen';
export { ColorPalette } from './ColorPalette';
export { DrawingCanvas } from './DrawingCanvas';
export {
  type DrawingMode,
  EnhancedDrawingCanvas,
} from './EnhancedDrawingCanvas';
export { SimpleColoringScreen } from './SimpleColoringScreen';
export { SimpleDrawingCanvas } from './SimpleDrawingCanvas';
export { Toolbar } from './Toolbar';

// Template System
export {
  type ColoringTemplate,
  getTemplatesByAgeGroup,
  getTemplatesByCategory,
  getTemplatesByDifficulty,
  SAMPLE_TEMPLATES,
  searchTemplates,
} from './templates/TemplateData';
export { TemplateLibrary } from './templates/TemplateLibrary';

// Gamification System
export {
  type Achievement,
  ACHIEVEMENTS,
  GamificationSystem,
  USER_LEVELS,
  type UserLevel,
  type UserStats,
} from './gamification/GamificationSystem';
export { ProgressScreen } from './gamification/ProgressScreen';

// Utilities
export {
  boundedFloodFill,
  colorDistance,
  floodFill,
  type FloodFillOptions,
  hexToRgb,
  type Point,
  rgbToHex,
} from './utils/FloodFill';
