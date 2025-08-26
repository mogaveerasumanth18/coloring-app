/* eslint-env node */

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for SVG files
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts.filter((ext) => ext !== 'svg'), 'bin', 'txt', 'jpg', 'png', 'json', 'wasm'],
  sourceExts: [...config.resolver.sourceExts, 'svg'],
};

module.exports = config;
