module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google", // O "plugin:import/errors" si no usas el estilo de google
  ],
  rules: {
    "quotes": ["error", "double"],
    "object-curly-spacing": ["error", "always"],
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
};