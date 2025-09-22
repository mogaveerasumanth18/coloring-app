declare module 'react-native-slider-color-picker' {
  import { ViewStyle } from 'react-native';

  export interface ColorPickerProps {
    oldColor: string;
    onColorChange: (color: string) => void;
    style?: ViewStyle;
  }

  export const ColorPicker: React.ComponentType<ColorPickerProps>;
}