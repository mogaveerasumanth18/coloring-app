/* eslint-env node */

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Temporarily disable NativeWind to fix lightningcss issues
module.exports = config;
