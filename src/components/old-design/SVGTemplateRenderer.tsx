import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

interface SVGTemplateRendererProps {
  svgData: string;
  width: number;
  height: number;
  style?: any;
}

export const SVGTemplateRenderer: React.FC<SVGTemplateRendererProps> = ({
  svgData,
  width,
  height,
  style,
}) => {
  if (!svgData) {
    return null;
  }

  // Simple SVG parser for basic shapes
  const parseSVGElements = (svgString: string) => {
    const elements: React.ReactNode[] = [];

    // Extract viewBox from original SVG for scaling
    const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/);
    let originalViewBox = `0 0 ${width} ${height}`;
    if (viewBoxMatch) {
      originalViewBox = viewBoxMatch[1];
    }

    // Parse circles
    const circleRegex = /<circle[^>]*>/g;
    let match;
    let elementKey = 0;

    while ((match = circleRegex.exec(svgString)) !== null) {
      const element = match[0];
      const cx = parseFloat(element.match(/cx="([^"]+)"/)?.[1] || '0');
      const cy = parseFloat(element.match(/cy="([^"]+)"/)?.[1] || '0');
      const r = parseFloat(element.match(/r="([^"]+)"/)?.[1] || '5');
      const stroke = element.match(/stroke="([^"]+)"/)?.[1] || '#000000';
      const strokeWidth = parseFloat(
        element.match(/stroke-width="([^"]+)"/)?.[1] || '2'
      );
      const fill = element.match(/fill="([^"]+)"/)?.[1] || 'none';

      elements.push(
        <Circle
          key={elementKey++}
          cx={cx}
          cy={cy}
          r={r}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill === 'none' ? 'transparent' : fill}
        />
      );
    }

    // Parse paths
    const pathRegex = /<path[^>]*>/g;
    while ((match = pathRegex.exec(svgString)) !== null) {
      const element = match[0];
      const d = element.match(/d="([^"]+)"/)?.[1] || '';
      const stroke = element.match(/stroke="([^"]+)"/)?.[1] || '#000000';
      const strokeWidth = parseFloat(
        element.match(/stroke-width="([^"]+)"/)?.[1] || '2'
      );
      const fill = element.match(/fill="([^"]+)"/)?.[1] || 'none';

      if (d) {
        elements.push(
          <Path
            key={elementKey++}
            d={d}
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill={fill === 'none' ? 'transparent' : fill}
          />
        );
      }
    }

    // Parse lines
    const lineRegex = /<line[^>]*>/g;
    while ((match = lineRegex.exec(svgString)) !== null) {
      const element = match[0];
      const x1 = parseFloat(element.match(/x1="([^"]+)"/)?.[1] || '0');
      const y1 = parseFloat(element.match(/y1="([^"]+)"/)?.[1] || '0');
      const x2 = parseFloat(element.match(/x2="([^"]+)"/)?.[1] || '0');
      const y2 = parseFloat(element.match(/y2="([^"]+)"/)?.[1] || '0');
      const stroke = element.match(/stroke="([^"]+)"/)?.[1] || '#000000';
      const strokeWidth = parseFloat(
        element.match(/stroke-width="([^"]+)"/)?.[1] || '2'
      );

      elements.push(
        <Line
          key={elementKey++}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }

    // Parse rectangles
    const rectRegex = /<rect[^>]*>/g;
    while ((match = rectRegex.exec(svgString)) !== null) {
      const element = match[0];
      const x = parseFloat(element.match(/x="([^"]+)"/)?.[1] || '0');
      const y = parseFloat(element.match(/y="([^"]+)"/)?.[1] || '0');
      const rectWidth = parseFloat(
        element.match(/width="([^"]+)"/)?.[1] || '0'
      );
      const rectHeight = parseFloat(
        element.match(/height="([^"]+)"/)?.[1] || '0'
      );
      const stroke = element.match(/stroke="([^"]+)"/)?.[1] || '#000000';
      const strokeWidth = parseFloat(
        element.match(/stroke-width="([^"]+)"/)?.[1] || '2'
      );
      const fill = element.match(/fill="([^"]+)"/)?.[1] || 'none';

      elements.push(
        <Rect
          key={elementKey++}
          x={x}
          y={y}
          width={rectWidth}
          height={rectHeight}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill === 'none' ? 'transparent' : fill}
        />
      );
    }

    // Parse ellipses
    const ellipseRegex = /<ellipse[^>]*>/g;
    while ((match = ellipseRegex.exec(svgString)) !== null) {
      const element = match[0];
      const cx = parseFloat(element.match(/cx="([^"]+)"/)?.[1] || '0');
      const cy = parseFloat(element.match(/cy="([^"]+)"/)?.[1] || '0');
      const rx = parseFloat(element.match(/rx="([^"]+)"/)?.[1] || '5');
      const ry = parseFloat(element.match(/ry="([^"]+)"/)?.[1] || '5');
      const stroke = element.match(/stroke="([^"]+)"/)?.[1] || '#000000';
      const strokeWidth = parseFloat(
        element.match(/stroke-width="([^"]+)"/)?.[1] || '2'
      );
      const fill = element.match(/fill="([^"]+)"/)?.[1] || 'none';

      elements.push(
        <Ellipse
          key={elementKey++}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill === 'none' ? 'transparent' : fill}
        />
      );
    }

    return { elements, originalViewBox };
  };

  const { elements, originalViewBox } = parseSVGElements(svgData);

  return (
    <Svg width={width} height={height} viewBox={originalViewBox} style={style}>
      <G>{elements}</G>
    </Svg>
  );
};
