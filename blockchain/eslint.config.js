const tsEslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const prettierConfig = require("eslint-config-prettier");
const prettierPlugin = require("eslint-plugin-prettier");

module.exports = [
  {
    files: ['**/*.{js,ts,tsx}'],
    ignores: [
      'coverage/**/*',
      'artifacts/**/*',
      'cache/**/*',
      'typechain-types/**/*', // generated files from typechain
      'eslint.config.js', // avoid self linting
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // tsconfigRootDir: __dirname,
        // project: ['./tsconfig.json'],
      },
    },
    plugins: {
      '@typescript-eslint': tsEslint,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsEslint.configs.recommended.rules,
      // ...tsEslint.configs['recommended-requiring-type-checking'].rules, // Temporarily disable due to potential config issues
      ...prettierConfig.rules,
      ...prettierPlugin.configs.recommended.rules,
    },
  },
];
