module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    'jest/globals': true,
  },
  plugins: ['jest'],
  extends: 'airbnb-base',
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    "no-shadow": 0,
    "max-len": 0,
    "no-restricted-syntax": 0,
    "no-underscore-dangle": 0,
    "no-continue": 0,
    "no-plusplus": 0,
    "grouped-accessor-pairs": 0,
    "class-methods-use-this": 0,
    "no-unused-vars": 1,
  },
};
