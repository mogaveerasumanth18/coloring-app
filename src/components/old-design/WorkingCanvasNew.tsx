import React, { useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface Stroke {
  path: string;
  color: string;
  width: number;
  type?: 'stroke' | 'fill';
}

interface WorkingCanvasProps {
  selectedColor: string;
  selectedTool: string;
  brushWidth?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

// Helper functions for boundary detection
const isInHouseArea = (
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): boolean => {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const margin = 8;

  if (x > margin && x < cx - margin && y > margin && y < cy - margin) {
    const houseLeft = 30;
    const houseRight = cx - 30;
    const houseBottom = cy - 30;
    const houseTop = cy - 110;

    return !(
      x > houseLeft - 5 &&
      x < houseRight + 5 &&
      y > houseTop - 5 &&
      y < houseBottom + 5
    );
  }
  return false;
};

const isInSunArea = (
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): boolean => {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const margin = 8;

  if (
    x > cx + margin &&
    x < canvasWidth - margin &&
    y > margin &&
    y < cy - margin
  ) {
    const sunCx = cx + 60;
    const sunCy = 60;
    const sunRadius = 35;
    const distanceFromSun = Math.sqrt((x - sunCx) ** 2 + (y - sunCy) ** 2);
    return distanceFromSun > sunRadius;
  }
  return false;
};

const isInFlowerArea = (
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): boolean => {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const margin = 8;

  if (
    x > margin &&
    x < cx - margin &&
    y > cy + margin &&
    y < canvasHeight - margin
  ) {
    const flowerCx = 60;
    const flowerCy = cy + 60;
    const flowerRadius = 40;
    const distanceFromFlower = Math.sqrt(
      (x - flowerCx) ** 2 + (y - flowerCy) ** 2
    );

    const stemLeft = flowerCx - 5;
    const stemRight = flowerCx + 5;
    const stemTop = cy + 75;
    const stemBottom = canvasHeight - 20;

    return (
      distanceFromFlower > flowerRadius &&
      !(x > stemLeft && x < stemRight && y > stemTop && y < stemBottom)
    );
  }
  return false;
};

const isInTreeArea = (
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): boolean => {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const margin = 8;

  if (
    x > cx + margin &&
    x < canvasWidth - margin &&
    y > cy + margin &&
    y < canvasHeight - margin
  ) {
    const trunkLeft = cx + 65;
    const trunkRight = cx + 85;
    const trunkTop = cy + 60;
    const trunkBottom = cy + 100;

    const treeCrownCx = cx + 77;
    const treeCrownCy = cy + 50;
    const treeCrownRadius = 30;
    const distanceFromCrown = Math.sqrt(
      (x - treeCrownCx) ** 2 + (y - treeCrownCy) ** 2
    );

    return (
      !(x > trunkLeft && x < trunkRight && y > trunkTop && y < trunkBottom) &&
      distanceFromCrown > treeCrownRadius
    );
  }
  return false;
};

const isPointInBounds = (
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): boolean => {
  return (
    isInHouseArea(x, y, canvasWidth, canvasHeight) ||
    isInSunArea(x, y, canvasWidth, canvasHeight) ||
    isInFlowerArea(x, y, canvasWidth, canvasHeight) ||
    isInTreeArea(x, y, canvasWidth, canvasHeight)
  );
};

const isInArea = (
  x: number,
  y: number,
  area: string,
  canvasWidth: number,
  canvasHeight: number
): boolean => {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  switch (area) {
    case 'section1':
      return x < cx && y < cy; // Top left
    case 'section2':
      return x > cx && y < cy; // Top right
    case 'section3':
      return x < cx && y > cy; // Bottom left
    case 'section4':
      return x > cx && y > cy; // Bottom right
    default:
      return false;
  }
};

export const WorkingCanvas = React.forwardRef<any, WorkingCanvasProps>(
  (
    {
      selectedColor = '#FF0000',
      selectedTool = 'brush',
      brushWidth = 5,
      canvasWidth = 300,
      canvasHeight = 220,
    },
    ref
  ) => {
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const [isDrawing, setIsDrawing] = useState(false);
    const [fillAreas, setFillAreas] = useState<{ [key: string]: string }>({});
    const svgRef = useRef<any>(null);

    const clearCanvas = useCallback(() => {
      setStrokes([]);
      setCurrentPath('');
    }, []);

    const undoStroke = useCallback(() => {
      setStrokes((prev) => prev.slice(0, -1));
    }, []);

    React.useImperativeHandle(ref, () => ({
      clear: clearCanvas,
      undo: undoStroke,
      getStrokes: () => strokes,
    }));

    const handlePointerDown = (event: any) => {
      console.log('Pointer down detected');

      if (Platform.OS === 'web' && event.preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }

      let x, y;
      if (Platform.OS === 'web') {
        const rect = event.currentTarget.getBoundingClientRect();
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
      } else {
        const touch = event.nativeEvent.touches[0];
        x = touch.locationX;
        y = touch.locationY;
      }

      if (selectedTool === 'bucket') {
        if (isInArea(x, y, 'section1', canvasWidth, canvasHeight)) {
          setFillAreas((prev) => ({ ...prev, section1: selectedColor }));
        } else if (isInArea(x, y, 'section2', canvasWidth, canvasHeight)) {
          setFillAreas((prev) => ({ ...prev, section2: selectedColor }));
        } else if (isInArea(x, y, 'section3', canvasWidth, canvasHeight)) {
          setFillAreas((prev) => ({ ...prev, section3: selectedColor }));
        } else if (isInArea(x, y, 'section4', canvasWidth, canvasHeight)) {
          setFillAreas((prev) => ({ ...prev, section4: selectedColor }));
        }
        return;
      }

      if (selectedTool === 'brush') {
        if (isPointInBounds(x, y, canvasWidth, canvasHeight)) {
          setIsDrawing(true);
          const newPath = `M${x.toFixed(1)},${y.toFixed(1)}`;
          setCurrentPath(newPath);
          console.log('Started path:', newPath);
        }
      }
    };

    const handlePointerMove = (event: any) => {
      if (!isDrawing || selectedTool !== 'brush') return;

      if (Platform.OS === 'web' && event.preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }

      let x, y;
      if (Platform.OS === 'web') {
        const rect = event.currentTarget.getBoundingClientRect();
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
      } else {
        const touch = event.nativeEvent.touches[0];
        x = touch.locationX;
        y = touch.locationY;
      }

      if (isPointInBounds(x, y, canvasWidth, canvasHeight)) {
        setCurrentPath((prev) => `${prev} L${x.toFixed(1)},${y.toFixed(1)}`);
      } else {
        if (currentPath) {
          const newStroke: Stroke = {
            path: currentPath,
            color: selectedColor,
            width: brushWidth,
          };
          setStrokes((prev) => [...prev, newStroke]);
          setCurrentPath('');
        }
      }
    };

    const handlePointerUp = () => {
      if (!isDrawing || !currentPath || selectedTool !== 'brush') return;

      console.log('Ending path:', currentPath);
      const newStroke: Stroke = {
        path: currentPath,
        color: selectedColor,
        width: brushWidth,
      };

      setStrokes((prev) => [...prev, newStroke]);
      setIsDrawing(false);
      setCurrentPath('');
      console.log('Added stroke, total strokes:', strokes.length + 1);
    };

    return (
      <View style={styles.container}>
        <Text style={styles.debug}>
          Strokes: {strokes.length} | Drawing: {isDrawing ? 'Yes' : 'No'} |
          Tool: {selectedTool}
        </Text>
        <View
          style={[
            styles.canvasContainer,
            { width: canvasWidth, height: canvasHeight },
          ]}
        >
          <Svg
            ref={svgRef}
            width={canvasWidth}
            height={canvasHeight}
            style={styles.svg}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handlePointerDown}
            onResponderMove={handlePointerMove}
            onResponderRelease={handlePointerUp}
            onResponderTerminate={handlePointerUp}
            {...(Platform.OS === 'web' && {
              onMouseDown: handlePointerDown,
              onMouseMove: handlePointerMove,
              onMouseUp: handlePointerUp,
              onMouseLeave: handlePointerUp,
              onTouchStart: handlePointerDown,
              onTouchMove: handlePointerMove,
              onTouchEnd: handlePointerUp,
              style: {
                ...styles.svg,
                touchAction: 'none',
                userSelect: 'none',
              },
            })}
          >
            {/* Background */}
            <Rect width={canvasWidth} height={canvasHeight} fill="#FFFFFF" />

            {/* Subtle background hints for coloring areas */}
            <Rect
              x={8}
              y={8}
              width={canvasWidth / 2 - 16}
              height={canvasHeight / 2 - 16}
              fill="#F8F9FF"
              opacity={0.3}
            />
            <Rect
              x={canvasWidth / 2 + 8}
              y={8}
              width={canvasWidth / 2 - 16}
              height={canvasHeight / 2 - 16}
              fill="#FFF8F8"
              opacity={0.3}
            />
            <Rect
              x={8}
              y={canvasHeight / 2 + 8}
              width={canvasWidth / 2 - 16}
              height={canvasHeight / 2 - 16}
              fill="#F8FFF8"
              opacity={0.3}
            />
            <Rect
              x={canvasWidth / 2 + 8}
              y={canvasHeight / 2 + 8}
              width={canvasWidth / 2 - 16}
              height={canvasHeight / 2 - 16}
              fill="#FFFFF8"
              opacity={0.3}
            />

            {/* Fill areas */}
            {fillAreas.section1 && (
              <Rect
                x={0}
                y={0}
                width={canvasWidth / 2}
                height={canvasHeight / 2}
                fill={fillAreas.section1}
                opacity={0.7}
              />
            )}
            {fillAreas.section2 && (
              <Rect
                x={canvasWidth / 2}
                y={0}
                width={canvasWidth / 2}
                height={canvasHeight / 2}
                fill={fillAreas.section2}
                opacity={0.7}
              />
            )}
            {fillAreas.section3 && (
              <Rect
                x={0}
                y={canvasHeight / 2}
                width={canvasWidth / 2}
                height={canvasHeight / 2}
                fill={fillAreas.section3}
                opacity={0.7}
              />
            )}
            {fillAreas.section4 && (
              <Rect
                x={canvasWidth / 2}
                y={canvasHeight / 2}
                width={canvasWidth / 2}
                height={canvasHeight / 2}
                fill={fillAreas.section4}
                opacity={0.7}
              />
            )}

            {/* Simple line art template */}
            <Path
              d={`M${canvasWidth / 2} 0 L${canvasWidth / 2} ${canvasHeight}`}
              stroke="#333"
              strokeWidth="3"
            />
            <Path
              d={`M0 ${canvasHeight / 2} L${canvasWidth} ${canvasHeight / 2}`}
              stroke="#333"
              strokeWidth="3"
            />

            {/* House */}
            <Path
              d={`M30 ${canvasHeight / 2 - 30} L${canvasWidth / 2 - 30} ${canvasHeight / 2 - 30} L${canvasWidth / 2 - 30} ${canvasHeight / 2 - 80} L${canvasWidth / 4} ${canvasHeight / 2 - 110} L30 ${canvasHeight / 2 - 80} Z`}
              stroke="#333"
              strokeWidth="3"
              fill="none"
            />
            <Rect
              x={canvasWidth / 4 - 15}
              y={canvasHeight / 2 - 50}
              width={30}
              height={20}
              stroke="#333"
              strokeWidth="2"
              fill="none"
            />

            {/* Sun */}
            <Circle
              cx={canvasWidth / 2 + 60}
              cy={60}
              r="30"
              stroke="#333"
              strokeWidth="3"
              fill="none"
            />
            <Path
              d={`M${canvasWidth / 2 + 60} 20 L${canvasWidth / 2 + 60} 10`}
              stroke="#333"
              strokeWidth="2"
            />
            <Path
              d={`M${canvasWidth / 2 + 90} 30 L${canvasWidth / 2 + 100} 20`}
              stroke="#333"
              strokeWidth="2"
            />
            <Path
              d={`M${canvasWidth / 2 + 90} 90 L${canvasWidth / 2 + 100} 100`}
              stroke="#333"
              strokeWidth="2"
            />
            <Path
              d={`M${canvasWidth / 2 + 60} 100 L${canvasWidth / 2 + 60} 110`}
              stroke="#333"
              strokeWidth="2"
            />
            <Path
              d={`M${canvasWidth / 2 + 30} 90 L${canvasWidth / 2 + 20} 100`}
              stroke="#333"
              strokeWidth="2"
            />
            <Path
              d={`M${canvasWidth / 2 + 30} 30 L${canvasWidth / 2 + 20} 20`}
              stroke="#333"
              strokeWidth="2"
            />

            {/* Flower */}
            <Circle
              cx={60}
              cy={canvasHeight / 2 + 60}
              r="15"
              stroke="#333"
              strokeWidth="3"
              fill="none"
            />
            <Circle
              cx={45}
              cy={canvasHeight / 2 + 45}
              r="12"
              stroke="#333"
              strokeWidth="2"
              fill="none"
            />
            <Circle
              cx={75}
              cy={canvasHeight / 2 + 45}
              r="12"
              stroke="#333"
              strokeWidth="2"
              fill="none"
            />
            <Circle
              cx={45}
              cy={canvasHeight / 2 + 75}
              r="12"
              stroke="#333"
              strokeWidth="2"
              fill="none"
            />
            <Circle
              cx={75}
              cy={canvasHeight / 2 + 75}
              r="12"
              stroke="#333"
              strokeWidth="2"
              fill="none"
            />
            <Path
              d={`M60 ${canvasHeight / 2 + 75} L60 ${canvasHeight - 20}`}
              stroke="#333"
              strokeWidth="3"
            />

            {/* Tree */}
            <Rect
              x={canvasWidth / 2 + 70}
              y={canvasHeight / 2 + 60}
              width={15}
              height={40}
              stroke="#333"
              strokeWidth="3"
              fill="none"
            />
            <Circle
              cx={canvasWidth / 2 + 77}
              cy={canvasHeight / 2 + 50}
              r="25"
              stroke="#333"
              strokeWidth="3"
              fill="none"
            />

            {/* User strokes */}
            {strokes.map((stroke, index) => (
              <Path
                key={index}
                d={stroke.path}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}

            {/* Current drawing */}
            {currentPath && (
              <Path
                d={currentPath}
                stroke={selectedColor}
                strokeWidth={brushWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.7}
              />
            )}
          </Svg>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  debug: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  canvasContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      touchAction: 'none',
      userSelect: 'none',
    }),
  },
  svg: {
    backgroundColor: 'white',
  },
});
