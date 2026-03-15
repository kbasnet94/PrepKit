const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = [...(config.resolver.assetExts || []), "wasm"];

// Note: COOP/COEP headers removed — expo-sqlite is lazy-loaded only on native.
// On web, guide cache uses AsyncStorage instead of SQLite/OPFS.

module.exports = config;
