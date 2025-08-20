# Line Art Assets

This directory contains bitmap line art images optimized for the coloring book app.

## Specifications (based on niccokunzmann/coloring-book)

- **Format**: PNG with transparent background
- **Dimensions**: 600×480 pixels (scaled to fit mobile screens)
- **Line Width**: 6-10 pixels for optimal touch interaction
- **Colors**: Black lines (#000000) on transparent background
- **Areas**: Minimum 2×(line_width²) pixels for touch-friendly coloring regions

## Usage

These images are designed to work with the bitmap-based coloring system:

1. Images are loaded as bitmap templates
2. Flood fill operations work on pixel-level data
3. Touch coordinates are mapped directly to bitmap pixels
4. Performance is optimized for mobile devices

## Image Categories

- `outline_flower_*`: Simple flower designs
- `outline_animal_*`: Animal silhouettes and cartoon characters
- `outline_mandala_*`: Geometric patterns and mandalas
- `outline_nature_*`: Trees, landscapes, and natural elements

## Adding New Images

When adding new line art:

1. Ensure black lines are 6-10 pixels wide
2. Leave adequate space between regions for coloring
3. Use transparent background for proper compositing
4. Test with flood fill to ensure areas are properly enclosed
5. Follow naming convention: `outline_[category]_[description].png`
