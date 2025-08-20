export interface Template {
  id: string;
  name: string;
  svgData: string;
}

export const SAMPLE_TEMPLATES: Template[] = [
  {
    id: 'basketball',
    name: 'Basketball',
    svgData: `<svg width="80" height="80" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle fill="none" stroke="#333" stroke-miterlimit="10" stroke-width="1.5" cx="16" cy="16" r="14"/><line fill="none" stroke="#333" stroke-miterlimit="10" stroke-width="1.5" x1="2" x2="30" y1="16" y2="16"/><line fill="none" stroke="#333" stroke-miterlimit="10" stroke-width="1.5" x1="16" x2="16" y1="2" y2="29.99"/><path fill="none" stroke="#333" stroke-miterlimit="10" stroke-width="1.5" d="M7.86,4.61c.21,1.94,.96,3.32,2.02,4.9,1.32,1.97,1.36,4.19,1.1,6.48"/><path fill="none" stroke="#333" stroke-miterlimit="10" stroke-width="1.5" d="M7.86,27.09c.21-1.94,.96-3.32,2.02-4.9,1.32-1.97,1.36-4.19,1.1-6.48"/><path fill="none" stroke="#333" stroke-miterlimit="10" stroke-width="1.5" d="M24.1,4.61c-.21,1.94-.96,3.32-2.02,4.9-1.32,1.97-1.36,4.19-1.1,6.48"/><path fill="none" stroke="#333" stroke-miterlimit="10" stroke-width="1.5" d="M24.1,27.09c-.21-1.94-.96-3.32-2.02-4.9-1.32-1.97-1.36-4.19-1.1-6.48"/></svg>`,
  },
  {
    id: 'chef-hat',
    name: 'Chef Hat',
    svgData: `<svg width="80" height="80" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="#333" stroke-width="1.5" d="M6.33,18.45v8.59c0,.41,.34,.75,.75,.75h15.13c.41,0,.75-.34,.75-.75v-8.6c1.91-.75,3.27-2.6,3.27-4.77,0-2.83-2.3-5.13-5.13-5.13-.56,0-1.13,.1-1.67,.28-1.2-1.87-3.24-3.01-5.49-3.01s-4.09,1.02-5.31,2.75c-3.06-.27-5.56,2.14-5.56,5.11,0,2.17,1.36,4.02,3.27,4.77Z"/><rect fill="none" stroke="#333" stroke-width="1.5" x="7.83" y="24.42" width="13.63" height="1.87"/><rect fill="none" stroke="#333" stroke-width="1.5" x="7.83" y="18.81" width="13.63" height="4.11"/></svg>`,
  },
  {
    id: 'wedding-cake',
    name: 'Wedding Cake',
    svgData: `<svg width="80" height="80" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="#333" stroke-width="1.5" d="M32,6L28,12L36,12Z"/><rect fill="none" stroke="#333" stroke-width="1.5" x="22" y="16" width="20" height="10" rx="2"/><rect fill="none" stroke="#333" stroke-width="1.5" x="16" y="26" width="32" height="14" rx="2"/><rect fill="none" stroke="#333" stroke-width="1.5" x="8" y="40" width="48" height="18" rx="2"/><line stroke="#333" stroke-width="1.5" x1="24" y1="20" x2="24" y2="22"/><line stroke="#333" stroke-width="1.5" x1="32" y1="20" x2="32" y2="22"/><line stroke="#333" stroke-width="1.5" x1="40" y1="20" x2="40" y2="22"/></svg>`,
  },
  {
    id: 'polo-shirt',
    name: 'Polo Shirt',
    svgData: `<svg width="80" height="80" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="#333" stroke-width="1.5" d="M8,7L8,22L16,22L16,7"/><path fill="none" stroke="#333" stroke-width="1.5" d="M6,5L8,7L8,12L6,10L6,5Z"/><path fill="none" stroke="#333" stroke-width="1.5" d="M18,5L16,7L16,12L18,10L18,5Z"/><path fill="none" stroke="#333" stroke-width="1.5" d="M10,7L10,12L14,12L14,7"/><circle fill="none" stroke="#333" stroke-width="1.5" cx="12" cy="9" r="0.5"/></svg>`,
  },
  {
    id: 'water-container',
    name: 'Water Container',
    svgData: `<svg width="80" height="80" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="#333" stroke-width="1.5" d="M8,4L8,20C8,21 9,22 10,22L14,22C15,22 16,21 16,20L16,4"/><rect fill="none" stroke="#333" stroke-width="1.5" x="7" y="2" width="10" height="2" rx="1"/><path fill="none" stroke="#333" stroke-width="1.5" d="M10,8C10,10 12,12 14,12C14,14 12,16 10,16"/></svg>`,
  },
  {
    id: 'test-shape',
    name: 'Test Shape',
    svgData: `<svg width="80" height="80" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle fill="none" stroke="#333" stroke-width="1.5" cx="12" cy="12" r="8"/><path fill="none" stroke="#333" stroke-width="1.5" d="M12,8L12,16"/><path fill="none" stroke="#333" stroke-width="1.5" d="M8,12L16,12"/></svg>`,
  },
];
