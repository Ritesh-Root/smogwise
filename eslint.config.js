import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'coverage/', 'dist/', 'web-old/'] },
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
    files: ['web/**/*.{js,jsx}', 'vite.config.js'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } }, globals: globals.browser },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z]' }],
    },
  },
];
