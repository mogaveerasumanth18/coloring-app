import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface TouchSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  trackColor?: string;
  fillColor?: string;
  thumbColor?: string;
  thumbBorderColor?: string;
  disabled?: boolean;
  style?: any;
  trackHeight?: number;
  thumbSize?: number;
}

export const TouchSlider: React.FC<TouchSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  trackColor = '#E2E8F0',
  fillColor = '#6366f1',
  thumbColor = '#ffffff',
  thumbBorderColor = '#4f46e5',
  disabled = false,
  style,
  trackHeight = 8,
  thumbSize = 28,
}) => {
  const [trackWidth, setTrackWidth] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const valueToPosition = React.useCallback((val: number) => {
    if (trackWidth <= 0) return 0;
    const percentage = (val - min) / (max - min);
    return clamp(percentage, 0, 1) * trackWidth;
  }, [trackWidth, min, max]);

  const positionToValue = React.useCallback((pos: number) => {
    if (trackWidth <= 0) return min;
    const percentage = clamp(pos / trackWidth, 0, 1);
    const rawValue = min + percentage * (max - min);
    return Math.round(rawValue / step) * step;
  }, [trackWidth, min, max, step]);

  // Update thumb position when value changes externally
  React.useEffect(() => {
    if (!isDragging) {
      translateX.value = withSpring(valueToPosition(value), {
        damping: 20,
        stiffness: 300,
      });
    }
  }, [value, valueToPosition, isDragging]);

  // Add tap gesture for direct positioning
  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onStart((event) => {
      const newPosition = clamp(event.x, 0, trackWidth);
      const newValue = positionToValue(newPosition);
      runOnJS(onChange)(newValue);
      translateX.value = withSpring(newPosition, {
        damping: 20,
        stiffness: 300,
      });
    });

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      setIsDragging(true);
      scale.value = withSpring(1.2, { damping: 15, stiffness: 200 });
      runOnJS(() => {
        // Haptic feedback on start (if available)
        try {
          if (Platform.OS === 'ios') {
            const { HapticFeedback } = require('expo-haptics');
            HapticFeedback?.impactAsync?.(HapticFeedback.ImpactFeedbackStyle.Light);
          }
        } catch (error) {
          // Haptics not available, continue silently
        }
      })();
    })
    .onUpdate((event) => {
      const newPosition = clamp(event.x, 0, trackWidth);
      translateX.value = newPosition;
      const newValue = positionToValue(newPosition);
      runOnJS(onChange)(newValue);
    })
    .onEnd(() => {
      setIsDragging(false);
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      // Snap to final position
      translateX.value = withSpring(valueToPosition(value), {
        damping: 20,
        stiffness: 300,
      });
    })
    .shouldCancelWhenOutside(false)
    .minDistance(0);

  // Combine tap and pan gestures
  const combinedGesture = Gesture.Race(tapGesture, panGesture);

  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value - thumbSize / 2 },
        { scale: scale.value },
      ],
    };
  });

  const fillStyle = useAnimatedStyle(() => {
    return {
      width: translateX.value,
    };
  });

  const thumbPosition = valueToPosition(value);

  return (
    <View style={[styles.container, style]}>
      <GestureDetector gesture={tapGesture}>
        <View
          style={[
            styles.track,
            {
              backgroundColor: trackColor,
              height: trackHeight,
              borderRadius: trackHeight / 2,
            }
          ]}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View
            style={[
              styles.fill,
              {
                backgroundColor: fillColor,
                borderRadius: trackHeight / 2,
              },
              fillStyle
            ]}
          />
          <GestureDetector gesture={combinedGesture}>
            <Animated.View
              style={[
                styles.thumb,
                {
                  backgroundColor: thumbColor,
                  borderColor: thumbBorderColor,
                  width: thumbSize,
                  height: thumbSize,
                  borderRadius: thumbSize / 2,
                  left: thumbPosition - thumbSize / 2,
                  top: -(thumbSize - trackHeight) / 2,
                },
                thumbStyle,
              ]}
            />
          </GestureDetector>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  track: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  thumb: {
    position: 'absolute',
    borderWidth: 3,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});