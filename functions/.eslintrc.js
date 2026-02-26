module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
  ],
  rules: {
    "quotes": "off",
    "object-curly-spacing": "off",
    "indent": "off",
    "no-unused-vars": "off",
    "max-len": "off",
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "comma-dangle": "off"
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
};