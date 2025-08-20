import type { ImageProps } from 'expo-image';
import { Image as NImage } from 'expo-image';
import * as React from 'react';

export type ImgProps = ImageProps;

export const Image = ({
  style,
  placeholder = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
  ...props
}: ImgProps) => {
  return <NImage placeholder={placeholder} style={style} {...props} />;
};

export const preloadImages = (sources: string[]) => {
  NImage.prefetch(sources);
};
