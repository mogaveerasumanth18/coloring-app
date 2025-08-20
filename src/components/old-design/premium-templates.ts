// Premium line art templates with 6-10px stroke widths for optimal coloring
// Combine with existing templates
import { SAMPLE_TEMPLATES } from './template-data';

export interface ColoringTemplate {
  id: string;
  name: string;
  fileName: string;
  category: 'animals' | 'nature' | 'objects' | 'characters';
  difficulty: 'easy' | 'medium' | 'hard';
  ageGroup: 'toddler' | 'child' | 'teen' | 'adult' | 'all';
  svgData: string;
}

export const PREMIUM_TEMPLATES: ColoringTemplate[] = [
  {
    id: 'butterfly-detailed',
    name: 'Detailed Butterfly',
    fileName: 'Detailed Butterfly',
    category: 'animals',
    difficulty: 'medium',
    ageGroup: 'child',
    svgData: `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      <!-- Body -->
      <ellipse cx="200" cy="150" rx="8" ry="80" fill="none" stroke="#000" stroke-width="6"/>
      <!-- Head -->
      <circle cx="200" cy="100" r="12" fill="none" stroke="#000" stroke-width="6"/>
      <!-- Antennae -->
      <path d="M190 95 Q185 85 180 80" fill="none" stroke="#000" stroke-width="4"/>
      <path d="M210 95 Q215 85 220 80" fill="none" stroke="#000" stroke-width="4"/>
      <circle cx="180" cy="80" r="3" fill="none" stroke="#000" stroke-width="4"/>
      <circle cx="220" cy="80" r="3" fill="none" stroke="#000" stroke-width="4"/>
      
      <!-- Left upper wing -->
      <path d="M195 120 Q150 90 120 100 Q90 110 80 140 Q70 170 90 190 Q110 200 140 190 Q170 180 195 150 Z" 
            fill="none" stroke="#000" stroke-width="6"/>
      <!-- Wing pattern -->
      <circle cx="130" cy="140" r="15" fill="none" stroke="#000" stroke-width="4"/>
      <circle cx="110" cy="165" r="8" fill="none" stroke="#000" stroke-width="4"/>
      
      <!-- Right upper wing -->
      <path d="M205 120 Q250 90 280 100 Q310 110 320 140 Q330 170 310 190 Q290 200 260 190 Q230 180 205 150 Z" 
            fill="none" stroke="#000" stroke-width="6"/>
      <!-- Wing pattern -->
      <circle cx="270" cy="140" r="15" fill="none" stroke="#000" stroke-width="4"/>
      <circle cx="290" cy="165" r="8" fill="none" stroke="#000" stroke-width="4"/>
      
      <!-- Left lower wing -->
      <path d="M195 180 Q160 200 140 220 Q120 240 130 260 Q140 280 160 275 Q180 270 195 250 Z" 
            fill="none" stroke="#000" stroke-width="6"/>
      <circle cx="155" cy="240" r="6" fill="none" stroke="#000" stroke-width="4"/>
      
      <!-- Right lower wing -->
      <path d="M205 180 Q240 200 260 220 Q280 240 270 260 Q260 280 240 275 Q220 270 205 250 Z" 
            fill="none" stroke="#000" stroke-width="6"/>
      <circle cx="245" cy="240" r="6" fill="none" stroke="#000" stroke-width="4"/>
    </svg>`,
  },
  {
    id: 'majestic-lion',
    name: 'Majestic Lion',
    fileName: 'Majestic Lion',
    category: 'animals',
    difficulty: 'hard',
    ageGroup: 'teen',
    svgData: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <!-- Head -->
      <circle cx="200" cy="200" r="80" fill="none" stroke="#000" stroke-width="8"/>
      
      <!-- Mane (multiple curved shapes) -->
      <path d="M120 200 Q100 150 130 120 Q160 100 190 120 Q180 140 170 160" fill="none" stroke="#000" stroke-width="6"/>
      <path d="M280 200 Q300 150 270 120 Q240 100 210 120 Q220 140 230 160" fill="none" stroke="#000" stroke-width="6"/>
      <path d="M200 120 Q150 90 120 110 Q100 130 120 150" fill="none" stroke="#000" stroke-width="6"/>
      <path d="M200 120 Q250 90 280 110 Q300 130 280 150" fill="none" stroke="#000" stroke-width="6"/>
      <path d="M140 280 Q120 320 150 340 Q180 350 200 330" fill="none" stroke="#000" stroke-width="6"/>
      <path d="M260 280 Q280 320 250 340 Q220 350 200 330" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Eyes -->
      <circle cx="170" cy="180" r="12" fill="none" stroke="#000" stroke-width="6"/>
      <circle cx="230" cy="180" r="12" fill="none" stroke="#000" stroke-width="6"/>
      <circle cx="170" cy="180" r="6" fill="#000"/>
      <circle cx="230" cy="180" r="6" fill="#000"/>
      
      <!-- Nose -->
      <path d="M190 210 Q200 200 210 210 Q205 220 200 225 Q195 220 190 210" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Mouth -->
      <path d="M200 225 Q180 240 170 250" fill="none" stroke="#000" stroke-width="6"/>
      <path d="M200 225 Q220 240 230 250" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Whiskers -->
      <line x1="120" y1="210" x2="160" y2="205" stroke="#000" stroke-width="4"/>
      <line x1="125" y1="230" x2="165" y2="225" stroke="#000" stroke-width="4"/>
      <line x1="240" y1="205" x2="280" y2="210" stroke="#000" stroke-width="4"/>
      <line x1="235" y1="225" x2="275" y2="230" stroke="#000" stroke-width="4"/>
    </svg>`,
  },
  {
    id: 'enchanted-flower',
    name: 'Enchanted Garden Flower',
    fileName: 'Enchanted Garden Flower',
    category: 'nature',
    difficulty: 'medium',
    ageGroup: 'all',
    svgData: `<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg">
      <!-- Center -->
      <circle cx="200" cy="200" r="25" fill="none" stroke="#000" stroke-width="8"/>
      <circle cx="200" cy="200" r="12" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Petals (8 detailed petals) -->
      <path d="M200 175 Q180 140 160 120 Q140 100 120 120 Q100 140 120 160 Q140 180 175 195 Q190 200 200 175" 
            fill="none" stroke="#000" stroke-width="6"/>
      <path d="M225 200 Q260 180 280 160 Q300 140 280 120 Q260 100 240 120 Q220 140 205 175 Q200 190 225 200" 
            fill="none" stroke="#000" stroke-width="6"/>
      <path d="M200 225 Q220 260 240 280 Q260 300 280 280 Q300 260 280 240 Q260 220 225 205 Q210 200 200 225" 
            fill="none" stroke="#000" stroke-width="6"/>
      <path d="M175 200 Q140 220 120 240 Q100 260 120 280 Q140 300 160 280 Q180 260 195 225 Q200 210 175 200" 
            fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Diagonal petals -->
      <path d="M185 185 Q150 150 130 130 Q110 110 90 130 Q70 150 90 170 Q110 190 145 205 Q165 210 185 185" 
            fill="none" stroke="#000" stroke-width="6"/>
      <path d="M215 185 Q250 150 270 130 Q290 110 310 130 Q330 150 310 170 Q290 190 255 205 Q235 210 215 185" 
            fill="none" stroke="#000" stroke-width="6"/>
      <path d="M215 215 Q250 250 270 270 Q290 290 310 270 Q330 250 310 230 Q290 210 255 195 Q235 190 215 215" 
            fill="none" stroke="#000" stroke-width="6"/>
      <path d="M185 215 Q150 250 130 270 Q110 290 90 270 Q70 250 90 230 Q110 210 145 195 Q165 190 185 215" 
            fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Stem -->
      <path d="M200 225 Q205 280 210 340 Q208 400 200 460" fill="none" stroke="#000" stroke-width="8"/>
      
      <!-- Leaves -->
      <path d="M210 300 Q240 290 260 305 Q280 320 270 340 Q260 360 240 355 Q220 350 210 330" 
            fill="none" stroke="#000" stroke-width="6"/>
      <path d="M190 360 Q160 350 140 365 Q120 380 130 400 Q140 420 160 415 Q180 410 190 390" 
            fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Leaf veins -->
      <path d="M210 315 Q235 315 255 325" fill="none" stroke="#000" stroke-width="4"/>
      <path d="M190 375 Q165 375 145 385" fill="none" stroke="#000" stroke-width="4"/>
    </svg>`,
  },
  {
    id: 'fantasy-castle',
    name: 'Fantasy Castle',
    fileName: 'Fantasy Castle',
    category: 'objects',
    difficulty: 'hard',
    ageGroup: 'teen',
    svgData: `<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg">
      <!-- Main castle base -->
      <rect x="150" y="250" width="200" height="120" fill="none" stroke="#000" stroke-width="8"/>
      
      <!-- Left tower -->
      <rect x="50" y="150" width="80" height="220" fill="none" stroke="#000" stroke-width="8"/>
      <polygon points="50,150 90,100 130,150" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Right tower -->
      <rect x="370" y="150" width="80" height="220" fill="none" stroke="#000" stroke-width="8"/>
      <polygon points="370,150 410,100 450,150" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Center tower -->
      <rect x="200" y="80" width="100" height="290" fill="none" stroke="#000" stroke-width="8"/>
      <polygon points="200,80 250,20 300,80" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Battlements -->
      <rect x="145" y="240" width="15" height="15" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="175" y="240" width="15" height="15" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="205" y="240" width="15" height="15" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="235" y="240" width="15" height="15" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="265" y="240" width="15" height="15" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="295" y="240" width="15" height="15" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="325" y="240" width="15" height="15" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="355" y="240" width="15" height="15" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Windows -->
      <rect x="70" y="180" width="20" height="30" rx="10" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="100" y="220" width="15" height="25" rx="7" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="390" y="180" width="20" height="30" rx="10" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="410" y="220" width="15" height="25" rx="7" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="230" y="120" width="20" height="35" rx="10" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="260" y="160" width="15" height="25" rx="7" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Main gate -->
      <path d="M220 300 Q220 280 240 280 Q260 280 260 300 L260 370 L220 370 Z" fill="none" stroke="#000" stroke-width="8"/>
      
      <!-- Gate details -->
      <circle cx="235" cy="320" r="3" fill="#000"/>
      <rect x="225" y="310" width="30" height="4" fill="none" stroke="#000" stroke-width="4"/>
      <rect x="225" y="320" width="30" height="4" fill="none" stroke="#000" stroke-width="4"/>
      <rect x="225" y="330" width="30" height="4" fill="none" stroke="#000" stroke-width="4"/>
      
      <!-- Flags -->
      <line x1="250" y1="20" x2="250" y2="50" stroke="#000" stroke-width="4"/>
      <polygon points="250,20 270,25 250,35 250,20" fill="none" stroke="#000" stroke-width="4"/>
      
      <!-- Clouds -->
      <circle cx="100" cy="60" r="15" fill="none" stroke="#000" stroke-width="4"/>
      <circle cx="115" cy="55" r="12" fill="none" stroke="#000" stroke-width="4"/>
      <circle cx="130" cy="60" r="10" fill="none" stroke="#000" stroke-width="4"/>
      
      <circle cx="350" cy="40" r="12" fill="none" stroke="#000" stroke-width="4"/>
      <circle cx="365" cy="35" r="10" fill="none" stroke="#000" stroke-width="4"/>
      <circle cx="375" cy="40" r="8" fill="none" stroke="#000" stroke-width="4"/>
    </svg>`,
  },
  {
    id: 'playful-elephant',
    name: 'Playful Elephant',
    fileName: 'Playful Elephant',
    category: 'animals',
    difficulty: 'easy',
    ageGroup: 'toddler',
    svgData: `<svg viewBox="0 0 400 350" xmlns="http://www.w3.org/2000/svg">
      <!-- Body -->
      <ellipse cx="200" cy="220" rx="80" ry="60" fill="none" stroke="#000" stroke-width="8"/>
      
      <!-- Head -->
      <circle cx="200" cy="140" r="50" fill="none" stroke="#000" stroke-width="8"/>
      
      <!-- Ears -->
      <ellipse cx="150" cy="130" rx="30" ry="45" fill="none" stroke="#000" stroke-width="6"/>
      <ellipse cx="250" cy="130" rx="30" ry="45" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Trunk -->
      <path d="M200 180 Q180 200 160 220 Q140 240 150 260 Q160 280 180 270 Q200 260 210 240" 
            fill="none" stroke="#000" stroke-width="8"/>
      
      <!-- Eyes -->
      <circle cx="180" cy="120" r="8" fill="none" stroke="#000" stroke-width="6"/>
      <circle cx="220" cy="120" r="8" fill="none" stroke="#000" stroke-width="6"/>
      <circle cx="180" cy="120" r="3" fill="#000"/>
      <circle cx="220" cy="120" r="3" fill="#000"/>
      
      <!-- Tusks -->
      <path d="M170 150 Q160 160 155 175" fill="none" stroke="#000" stroke-width="6"/>
      <path d="M230 150 Q240 160 245 175" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Legs -->
      <rect x="150" y="270" width="20" height="50" rx="10" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="180" y="270" width="20" height="50" rx="10" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="200" y="270" width="20" height="50" rx="10" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="230" y="270" width="20" height="50" rx="10" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Tail -->
      <path d="M280 220 Q320 230 340 250 Q350 260 345 270" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Trunk tip -->
      <circle cx="210" cy="240" r="8" fill="none" stroke="#000" stroke-width="6"/>
    </svg>`,
  },
  {
    id: 'mandala-simple',
    name: 'Simple Mandala',
    fileName: 'Simple Mandala',
    category: 'objects',
    difficulty: 'medium',
    ageGroup: 'teen',
    svgData: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer circle -->
      <circle cx="200" cy="200" r="180" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Inner circles -->
      <circle cx="200" cy="200" r="140" fill="none" stroke="#000" stroke-width="6"/>
      <circle cx="200" cy="200" r="100" fill="none" stroke="#000" stroke-width="6"/>
      <circle cx="200" cy="200" r="60" fill="none" stroke="#000" stroke-width="6"/>
      <circle cx="200" cy="200" r="30" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Petals around outer ring -->
      <ellipse cx="200" cy="80" rx="20" ry="40" fill="none" stroke="#000" stroke-width="6"/>
      <ellipse cx="200" cy="320" rx="20" ry="40" fill="none" stroke="#000" stroke-width="6"/>
      <ellipse cx="80" cy="200" rx="40" ry="20" fill="none" stroke="#000" stroke-width="6"/>
      <ellipse cx="320" cy="200" rx="40" ry="20" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Diagonal petals -->
      <ellipse cx="285" cy="115" rx="25" ry="35" fill="none" stroke="#000" stroke-width="6" transform="rotate(45 285 115)"/>
      <ellipse cx="115" cy="115" rx="25" ry="35" fill="none" stroke="#000" stroke-width="6" transform="rotate(-45 115 115)"/>
      <ellipse cx="285" cy="285" rx="25" ry="35" fill="none" stroke="#000" stroke-width="6" transform="rotate(-45 285 285)"/>
      <ellipse cx="115" cy="285" rx="25" ry="35" fill="none" stroke="#000" stroke-width="6" transform="rotate(45 115 285)"/>
      
      <!-- Inner pattern -->
      <polygon points="200,140 220,170 200,200 180,170" fill="none" stroke="#000" stroke-width="6"/>
      <polygon points="200,260 220,230 200,200 180,230" fill="none" stroke="#000" stroke-width="6"/>
      <polygon points="140,200 170,180 200,200 170,220" fill="none" stroke="#000" stroke-width="6"/>
      <polygon points="260,200 230,180 200,200 230,220" fill="none" stroke="#000" stroke-width="6"/>
      
      <!-- Center star -->
      <polygon points="200,170 210,190 200,210 190,190" fill="none" stroke="#000" stroke-width="6"/>
    </svg>`,
  },
];

// Helper functions
export const getTemplatesByCategory = (
  category: ColoringTemplate['category']
): ColoringTemplate[] => {
  return PREMIUM_TEMPLATES.filter((template) => template.category === category);
};

export const getTemplatesByDifficulty = (
  difficulty: ColoringTemplate['difficulty']
): ColoringTemplate[] => {
  return PREMIUM_TEMPLATES.filter(
    (template) => template.difficulty === difficulty
  );
};

export const getTemplatesByAgeGroup = (
  ageGroup: ColoringTemplate['ageGroup']
): ColoringTemplate[] => {
  return PREMIUM_TEMPLATES.filter(
    (template) => template.ageGroup === ageGroup || template.ageGroup === 'all'
  );
};

export const searchTemplates = (searchTerm: string): ColoringTemplate[] => {
  return PREMIUM_TEMPLATES.filter(
    (template) =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

export const ALL_TEMPLATES = [...SAMPLE_TEMPLATES, ...PREMIUM_TEMPLATES];
