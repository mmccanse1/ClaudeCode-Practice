const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('web.tsx', 'web.ts', 'web.js');
module.exports = config;
