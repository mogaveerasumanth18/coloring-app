// Asset SVG Templates
export const assetTemplates = [
  {
    id: 'cel-cake-wedding',
    name: 'Wedding Cake',
    fileName: 'cel-cake-wedding.svg',
  },
  {
    id: 'hat-chef',
    name: 'Chef Hat',
    fileName: 'hat-chef.svg',
  },
  {
    id: 'bola-basket-basketball',
    name: 'Basketball',
    fileName: 'bola-basket-basketball.svg',
  },
  {
    id: 'clo-polo',
    name: 'Polo Shirt',
    fileName: 'clo-polo.svg',
  },
  {
    id: 'water-container',
    name: 'Water Container',
    fileName: 'water-container.svg',
  },
  {
    id: 'test',
    name: 'Test Pattern',
    fileName: 'test.svg',
  },
];

// Function to load SVG content from assets
export const loadAssetSvg = async (
  fileName: string
): Promise<string | null> => {
  try {
    // In React Native, we need to import assets differently
    // For now, we'll create a mapping for the assets
    const svgAssets: { [key: string]: any } = {
      'cel-cake-wedding.svg': require('../assets/cel-cake-wedding.svg'),
      'hat-chef.svg': require('../assets/hat-chef.svg'),
      'bola-basket-basketball.svg': require('../assets/bola-basket-basketball.svg'),
      'clo-polo.svg': require('../assets/clo-polo.svg'),
      'water-container.svg': require('../assets/water-container.svg'),
      'test.svg': require('../assets/test.svg'),
    };

    const asset = svgAssets[fileName];
    if (asset) {
      // For SVG files imported as assets, we might get a URI
      // We'll need to fetch the content or handle it differently
      return asset;
    }
    return null;
  } catch (error) {
    console.error('Error loading SVG asset:', error);
    return null;
  }
};

// Alternative approach: Load SVG content directly as strings
export const getAssetSvgContent = (templateId: string): string | null => {
  const svgTemplates: { [key: string]: string } = {
    'cel-cake-wedding': `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="800px" height="800px" viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <title>cel-cake-wedding</title>
    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <path d="M35.12,11.817 C36.302,10.48 36.301,8.387 35.119,7.05 C34.52,6.372 33.713,5.999 32.848,5.999 C32.165,5.999 31.519,6.23 30.999,6.644 C29.782,5.687 27.949,5.845 26.884,7.05 C25.701,8.387 25.701,10.482 26.881,11.815 L30.25,15.659 C30.44,15.876 30.714,16 31.002,16 C31.29,16 31.564,15.876 31.754,15.659 L35.12,11.817 Z M28.379,10.493 C27.871,9.92 27.872,8.95 28.379,8.376 C28.593,8.134 28.868,8 29.153,8 C29.438,8 29.713,8.134 29.961,8.411 L30.284,8.742 C30.66,9.129 31.339,9.129 31.715,8.742 L32.072,8.376 C32.286,8.133 32.561,8 32.846,8 C33.131,8 33.405,8.133 33.619,8.375 C34.127,8.95 34.127,9.92 33.619,10.493 L31,13.482 L28.379,10.493 Z" fill="#000000"/>
        <path d="M56,24 L56,26 L8,26 L8,24 L56,24 Z M54,22 L10,22 L10,20 L54,20 L54,22 Z M52,18 L12,18 L12,16 L52,16 L52,18 Z M50,14 L14,14 L14,12 L50,12 L50,14 Z M48,10 L16,10 L16,8 L48,8 L48,10 Z M46,6 L18,6 L18,4 L46,4 L46,6 Z M44,2 L20,2 L20,0 L44,0 L44,2 Z" fill="#000000"/>
        <circle cx="32" cy="40" r="12" fill="none" stroke="#000000" stroke-width="2"/>
        <circle cx="32" cy="40" r="8" fill="none" stroke="#000000" stroke-width="1"/>
        <circle cx="32" cy="40" r="4" fill="none" stroke="#000000" stroke-width="1"/>
        <path d="M20,52 L44,52 L44,60 L20,60 L20,52 Z" fill="none" stroke="#000000" stroke-width="2"/>
        <rect x="22" y="54" width="4" height="4" fill="none" stroke="#000000" stroke-width="1"/>
        <rect x="30" y="54" width="4" height="4" fill="none" stroke="#000000" stroke-width="1"/>
        <rect x="38" y="54" width="4" height="4" fill="none" stroke="#000000" stroke-width="1"/>
    </g>
</svg>`,

    'hat-chef': `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="800px" height="800px" viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <title>hat-chef</title>
    <g stroke="none" stroke-width="2" fill="none" fill-rule="evenodd">
        <path d="M32,8 C36,8 42,10 46,14 C50,18 52,24 50,30 C48,36 44,38 40,40 L40,48 L24,48 L24,40 C20,38 16,36 14,30 C12,24 14,18 18,14 C22,10 28,8 32,8 Z" fill="none" stroke="#000000"/>
        <rect x="20" y="48" width="24" height="8" fill="none" stroke="#000000"/>
        <line x1="22" y1="50" x2="42" y2="50" stroke="#000000"/>
        <line x1="22" y1="52" x2="42" y2="52" stroke="#000000"/>
        <line x1="22" y1="54" x2="42" y2="54" stroke="#000000"/>
        <circle cx="28" cy="20" r="3" fill="none" stroke="#000000" stroke-width="1"/>
        <circle cx="36" cy="16" r="2" fill="none" stroke="#000000" stroke-width="1"/>
        <circle cx="40" cy="24" r="2" fill="none" stroke="#000000" stroke-width="1"/>
        <circle cx="24" cy="26" r="2" fill="none" stroke="#000000" stroke-width="1"/>
    </g>
</svg>`,

    'bola-basket-basketball': `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="800px" height="800px" viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <title>bola-basket-basketball</title>
    <g stroke="none" stroke-width="2" fill="none" fill-rule="evenodd">
        <circle cx="32" cy="32" r="24" fill="none" stroke="#000000"/>
        <path d="M8,32 Q32,8 56,32" fill="none" stroke="#000000"/>
        <path d="M8,32 Q32,56 56,32" fill="none" stroke="#000000"/>
        <line x1="32" y1="8" x2="32" y2="56" stroke="#000000"/>
        <line x1="8" y1="32" x2="56" y2="32" stroke="#000000"/>
    </g>
</svg>`,

    'clo-polo': `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="800px" height="800px" viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <title>clo-polo</title>
    <g stroke="none" stroke-width="2" fill="none" fill-rule="evenodd">
        <path d="M20,16 L20,12 L44,12 L44,16 L40,20 L40,56 L24,56 L24,20 L20,16 Z" fill="none" stroke="#000000"/>
        <path d="M20,16 L16,20 L16,24 L20,20" fill="none" stroke="#000000"/>
        <path d="M44,16 L48,20 L48,24 L44,20" fill="none" stroke="#000000"/>
        <rect x="28" y="16" width="8" height="6" fill="none" stroke="#000000" stroke-width="1"/>
        <line x1="30" y1="18" x2="34" y2="18" stroke="#000000" stroke-width="1"/>
        <line x1="30" y1="20" x2="34" y2="20" stroke="#000000" stroke-width="1"/>
        <line x1="26" y1="28" x2="38" y2="28" stroke="#000000" stroke-width="1"/>
        <line x1="26" y1="32" x2="38" y2="32" stroke="#000000" stroke-width="1"/>
    </g>
</svg>`,

    'water-container': `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="800px" height="800px" viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <title>water-container</title>
    <g stroke="none" stroke-width="2" fill="none" fill-rule="evenodd">
        <path d="M24,8 L40,8 L38,56 L26,56 L24,8 Z" fill="none" stroke="#000000"/>
        <rect x="22" y="4" width="20" height="8" fill="none" stroke="#000000"/>
        <line x1="26" y1="6" x2="38" y2="6" stroke="#000000" stroke-width="1"/>
        <path d="M26,20 Q32,24 38,20" fill="none" stroke="#000000" stroke-width="1"/>
        <path d="M26,28 Q32,32 38,28" fill="none" stroke="#000000" stroke-width="1"/>
        <path d="M26,36 Q32,40 38,36" fill="none" stroke="#000000" stroke-width="1"/>
        <circle cx="30" cy="16" r="1" fill="#000000"/>
        <circle cx="34" cy="18" r="1" fill="#000000"/>
        <circle cx="32" cy="24" r="1" fill="#000000"/>
    </g>
</svg>`,

    test: `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="800px" height="800px" viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <title>test</title>
    <g stroke="none" stroke-width="2" fill="none" fill-rule="evenodd">
        <rect x="8" y="8" width="48" height="48" fill="none" stroke="#000000"/>
        <circle cx="32" cy="32" r="16" fill="none" stroke="#000000"/>
        <line x1="16" y1="16" x2="48" y2="48" stroke="#000000"/>
        <line x1="48" y1="16" x2="16" y2="48" stroke="#000000"/>
        <path d="M32,16 L40,32 L32,48 L24,32 Z" fill="none" stroke="#000000"/>
    </g>
</svg>`,
  };

  return svgTemplates[templateId] || null;
};
