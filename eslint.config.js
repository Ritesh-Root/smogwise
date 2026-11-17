import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', '**/coverage/', 'dist/', 'web-old/', 'playwright-report/', 'test-results/'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node },
    rules: {
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Server code: keep functions small, shallow and free of stray console output (use src/logger.js).
    files: ['server.js', 'src/**/*.js'],
    rules: {
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      'no-console': 'error',
      'consistent-return': 'error',
      'no-shadow': 'error',
      'no-param-reassign': 'error',
      'prefer-template': 'error',
      curly: ['error', 'multi-line'],
    },
  },
  {
    files: ['web/**/*.{js,jsx}', 'vite.config.js', 'e2e/**'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } }, globals: globals.browser },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
