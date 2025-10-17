declare module 'react-native-wheel-color-picker' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export interface ColorPickerProps {
    color?: string;
    onColorChange?: (color: string) => void;
    onColorChangeComplete?: (color: string) => void;
    thumbSize?: number;
    sliderSize?: number;
    noSnap?: boolean;
    row?: boolean;
    swatches?: boolean;
    swatchesOnly?: boolean;
    discrete?: boolean;
    wheelLodingIndicator?: any;
    sliderLodingIndicator?: any;
    useNativeDriver?: boolean;
    useNativeLayout?: boolean;
    style?: ViewStyle;
    gapSize?: number;
    autoResetSlider?: boolean;
  }

  export default class ColorPicker extends Component<ColorPickerProps> {}
}
