module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated's plugin has to be last — it rewrites worklets and expects
      // to see the final AST.
      'react-native-reanimated/plugin',
    ],
  };
};
