export interface ColoringTemplate {
  id: string;
  title: string;
  category:
    | 'animals'
    | 'nature'
    | 'vehicles'
    | 'characters'
    | 'shapes'
    | 'patterns';
  difficulty: 'easy' | 'medium' | 'hard';
  svgData: string;
  thumbnail: string;
  tags: string[];
  ageGroup: '3-5' | '6-8' | '9-12' | 'all';
}

export const SAMPLE_TEMPLATES: ColoringTemplate[] = [
  {
    id: 'butterfly-1',
    title: 'Beautiful Butterfly',
    category: 'animals',
    difficulty: 'easy',
    svgData: `
      <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
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
      </svg>
    `,
    thumbnail:
      'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNDAwIDMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwMCAxNTAgUTE2MCAxMjAgMTQwIDEwMCBRMTIwIDgwIDExMCA2MCBRMTAwIDQwIDEyMCAzMCBRMTQwIDIwIDE2MCA0MCBRMTgwIDYwIDIwMCA4MCBaIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4=',
    tags: ['butterfly', 'wings', 'nature', 'flying'],
    ageGroup: '3-5',
  },
  {
    id: 'car-1',
    title: 'Racing Car',
    category: 'vehicles',
    difficulty: 'medium',
    svgData: `
      <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
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
      </svg>
    `,
    thumbnail:
      'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNDAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iNTAiIHk9IjEyMCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSI0MCIgcng9IjEwIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4=',
    tags: ['car', 'vehicle', 'racing', 'wheels'],
    ageGroup: '6-8',
  },
  {
    id: 'flower-1',
    title: 'Spring Flower',
    category: 'nature',
    difficulty: 'easy',
    svgData: `
      <svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
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
      </svg>
    `,
    thumbnail:
      'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMzAwIDQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSIyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+',
    tags: ['flower', 'petals', 'garden', 'spring'],
    ageGroup: '3-5',
  },
  {
    id: 'castle-1',
    title: 'Magic Castle',
    category: 'characters',
    difficulty: 'hard',
    svgData: `
      <svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg">
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
      </svg>
    `,
    thumbnail:
      'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTAwIDQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMTAwIiB5PSIyMDAiIHdpZHRoPSIzMDAiIGhlaWdodD0iMTUwIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4=',
    tags: ['castle', 'princess', 'towers', 'fairy tale'],
    ageGroup: '9-12',
  },
];

export const getTemplatesByCategory = (
  category: ColoringTemplate['category']
) => {
  return SAMPLE_TEMPLATES.filter((template) => template.category === category);
};

export const getTemplatesByDifficulty = (
  difficulty: ColoringTemplate['difficulty']
) => {
  return SAMPLE_TEMPLATES.filter(
    (template) => template.difficulty === difficulty
  );
};

export const getTemplatesByAgeGroup = (
  ageGroup: ColoringTemplate['ageGroup']
) => {
  return SAMPLE_TEMPLATES.filter(
    (template) => template.ageGroup === ageGroup || template.ageGroup === 'all'
  );
};

export const searchTemplates = (query: string) => {
  const lowercaseQuery = query.toLowerCase();
  return SAMPLE_TEMPLATES.filter(
    (template) =>
      template.title.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)) ||
      template.category.toLowerCase().includes(lowercaseQuery)
  );
};
