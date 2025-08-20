// Using actual SVG content for reliable rendering
export interface Template {
  id: string;
  name: string;
  fileName: string; // For display in canvas header
  svgData: string; // Raw SVG content for both previews and canvas
}

export const SAMPLE_TEMPLATES: Template[] = [
  {
    id: 'butterfly-1',
    name: 'Beautiful Butterfly',
    fileName: 'Beautiful Butterfly',
    svgData: `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        <path d="M200 150 Q160 120 140 100 Q120 80 110 60 Q100 40 120 30 Q140 20 160 40 Q180 60 200 80 Z" 
              fill="none" stroke="#000" stroke-width="2"/>
        <path d="M200 150 Q240 120 260 100 Q280 80 290 60 Q300 40 280 30 Q260 20 240 40 Q220 60 200 80 Z" 
              fill="none" stroke="#000" stroke-width="2"/>
        <path d="M200 150 Q160 180 140 200 Q120 220 110 240 Q100 260 120 270 Q140 280 160 260 Q180 240 200 220 Z" 
              fill="none" stroke="#000" stroke-width="2"/>
        <path d="M200 150 Q240 180 260 200 Q280 220 290 240 Q300 260 280 270 Q260 280 240 260 Q220 240 200 220 Z" 
              fill="none" stroke="#000" stroke-width="2"/>
        <line x1="200" y1="50" x2="200" y2="250" stroke="#000" stroke-width="3"/>
        <circle cx="200" cy="70" r="8" fill="none" stroke="#000" stroke-width="2"/>
        <line x1="190" y1="60" x2="185" y2="50" stroke="#000" stroke-width="2"/>
        <line x1="210" y1="60" x2="215" y2="50" stroke="#000" stroke-width="2"/>
      </svg>`,
  },
  {
    id: 'car-1',
    name: 'Racing Car',
    fileName: 'Racing Car',
    svgData: `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
        <rect x="50" y="120" width="300" height="40" rx="10" fill="none" stroke="#000" stroke-width="2"/>
        <rect x="80" y="100" width="240" height="20" rx="5" fill="none" stroke="#000" stroke-width="2"/>
        <rect x="120" y="80" width="160" height="20" rx="5" fill="none" stroke="#000" stroke-width="2"/>
        <circle cx="120" cy="160" r="25" fill="none" stroke="#000" stroke-width="3"/>
        <circle cx="280" cy="160" r="25" fill="none" stroke="#000" stroke-width="3"/>
        <circle cx="120" cy="160" r="15" fill="none" stroke="#000" stroke-width="2"/>
        <circle cx="280" cy="160" r="15" fill="none" stroke="#000" stroke-width="2"/>
        <rect x="140" y="90" width="30" height="15" fill="none" stroke="#000" stroke-width="2"/>
        <rect x="230" y="90" width="30" height="15" fill="none" stroke="#000" stroke-width="2"/>
        <path d="M50 140 L30 140 L20 150 L30 160 L50 160" fill="none" stroke="#000" stroke-width="2"/>
      </svg>`,
  },
  {
    id: 'flower-1',
    name: 'Spring Flower',
    fileName: 'Spring Flower',
    svgData: `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
        <circle cx="150" cy="150" r="20" fill="none" stroke="#000" stroke-width="2"/>
        <ellipse cx="150" cy="100" rx="25" ry="40" fill="none" stroke="#000" stroke-width="2"/>
        <ellipse cx="200" cy="150" rx="40" ry="25" fill="none" stroke="#000" stroke-width="2" transform="rotate(90 200 150)"/>
        <ellipse cx="150" cy="200" rx="25" ry="40" fill="none" stroke="#000" stroke-width="2"/>
        <ellipse cx="100" cy="150" rx="40" ry="25" fill="none" stroke="#000" stroke-width="2" transform="rotate(90 100 150)"/>
        <ellipse cx="185" cy="115" rx="20" ry="30" fill="none" stroke="#000" stroke-width="2" transform="rotate(45 185 115)"/>
        <ellipse cx="185" cy="185" rx="20" ry="30" fill="none" stroke="#000" stroke-width="2" transform="rotate(-45 185 185)"/>
        <ellipse cx="115" cy="115" rx="20" ry="30" fill="none" stroke="#000" stroke-width="2" transform="rotate(-45 115 115)"/>
        <ellipse cx="115" cy="185" rx="20" ry="30" fill="none" stroke="#000" stroke-width="2" transform="rotate(45 115 185)"/>
        <line x1="150" y1="220" x2="150" y2="350" stroke="#000" stroke-width="4"/>
        <path d="M150 280 Q130 270 120 285 Q130 295 150 290" fill="none" stroke="#000" stroke-width="2"/>
        <path d="M150 320 Q170 310 180 325 Q170 335 150 330" fill="none" stroke="#000" stroke-width="2"/>
      </svg>`,
  },
  {
    id: 'castle-1',
    name: 'Magic Castle',
    fileName: 'Magic Castle',
    svgData: `<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg">
        <rect x="100" y="200" width="300" height="150" fill="none" stroke="#000" stroke-width="2"/>
        <rect x="80" y="150" width="60" height="200" fill="none" stroke="#000" stroke-width="2"/>
        <rect x="360" y="150" width="60" height="200" fill="none" stroke="#000" stroke-width="2"/>
        <rect x="200" y="100" width="100" height="250" fill="none" stroke="#000" stroke-width="2"/>
        <polygon points="110,150 110,120 130,120 130,130 150,130 150,120 170,120 170,150" fill="none" stroke="#000" stroke-width="2"/>
        <polygon points="330,150 330,120 350,120 350,130 370,130 370,120 390,120 390,150" fill="none" stroke="#000" stroke-width="2"/>
        <polygon points="200,100 225,70 275,70 300,100" fill="none" stroke="#000" stroke-width="2"/>
        <rect x="170" y="250" width="40" height="60" fill="none" stroke="#000" stroke-width="2"/>
        <rect x="290" y="250" width="40" height="60" fill="none" stroke="#000" stroke-width="2"/>
        <circle cx="250" cy="180" r="15" fill="none" stroke="#000" stroke-width="2"/>
        <rect x="235" y="280" width="30" height="70" rx="15" fill="none" stroke="#000" stroke-width="2"/>
        <line x1="120" y1="300" x2="140" y2="300" stroke="#000" stroke-width="2"/>
        <line x1="360" y1="300" x2="380" y2="300" stroke="#000" stroke-width="2"/>
      </svg>`,
  },
  {
    id: 'basketball',
    name: 'Basketball',
    fileName: 'Basketball',
    svgData: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle fill="none" stroke="#000" stroke-width="2" cx="50" cy="50" r="40"/>
        <line stroke="#000" stroke-width="2" x1="10" x2="90" y1="50" y2="50"/>
        <line stroke="#000" stroke-width="2" x1="50" x2="50" y1="10" y2="90"/>
        <path fill="none" stroke="#000" stroke-width="2" d="M25,15 Q30,25 35,35 Q40,45 35,50"/>
        <path fill="none" stroke="#000" stroke-width="2" d="M25,85 Q30,75 35,65 Q40,55 35,50"/>
        <path fill="none" stroke="#000" stroke-width="2" d="M75,15 Q70,25 65,35 Q60,45 65,50"/>
        <path fill="none" stroke="#000" stroke-width="2" d="M75,85 Q70,75 65,65 Q60,55 65,50"/>
      </svg>`,
  },
  {
    id: 'test-shape',
    name: 'Test Shape',
    fileName: 'Test Shape',
    svgData: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle fill="none" stroke="#000" stroke-width="2" cx="50" cy="50" r="40"/>
        <path fill="none" stroke="#000" stroke-width="2" d="M50,20 L50,80"/>
        <path fill="none" stroke="#000" stroke-width="2" d="M20,50 L80,50"/>
      </svg>`,
  },
];
