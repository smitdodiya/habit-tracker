module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4 (SDK 54) moved worklet transformation into its own
      // package; 'react-native-reanimated/plugin' is a shim for it now.
      // Must stay last — it rewrites worklets and expects the final AST.
      'react-native-worklets/plugin',
    ],
  };
};
