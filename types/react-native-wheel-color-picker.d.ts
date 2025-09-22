declare module 'react-native-wheel-color-picker' {
  import { Component } from 'react';
  
  export interface ColorPickerProps {
    color?: string;
    onColorChange?: (color: string) => void;
    onColorChangeComplete?: (color: string) => void;
    thumbSize?: number;
    sliderSize?: number;
    noSnap?: boolean;
    row?: boolean;
    swatches?: boolean;
    swatchesLast?: boolean;
    swatchesOnly?: boolean;
    discrete?: boolean;
    wheelLodingIndicator?: React.ReactNode;
    sliderLodingIndicator?: React.ReactNode;
    useNativeDriver?: boolean;
    useNativeLayout?: boolean;
    palette?: string[];
  }
  
  export default class ColorPicker extends Component<ColorPickerProps> {}
}