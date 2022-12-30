module.exports = {
  env: {
    browser: false,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    'plugin:@typescript-eslint/recommended'
  ],
  ignorePatterns: ["examples/**/"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: './tsconfig.json',
  },
  plugins: ["@typescript-eslint", "prettier"],
  rules: {
    "@typescript-eslint/no-floating-promises": "error",
    "prettier/prettier": "error",
    "linebreak-style": ["error", "unix"],
    "no-console": ["error", { allow: ["warn", "error"] }],
    quotes: ["error", "single"],
    semi: ["error", "always"],
    'prettier/prettier': 'error',
    'no-useless-escape': 0,
    'no-unused-vars': 'off',
    "max-len": [
      "error",
      {
        "code": 120,
        "ignoreStrings": true,
        "ignoreComments": true,
        "ignoreUrls": true
      }
    ]
  },
};