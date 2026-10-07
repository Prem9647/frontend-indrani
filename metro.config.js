const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// lucide-react-native's ESM ("exports"."react-native") build does nested
// relative imports (./icons/*.mjs) that Metro's package-exports resolver
// can't follow, even though the .mjs files exist — a known Metro/lucide
// incompatibility. Disabling package-exports resolution makes Metro fall
// back to the package's CommonJS "main" build instead, which resolves fine.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: "./global.css" });
