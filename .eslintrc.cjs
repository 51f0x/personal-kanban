module.exports = {
  root: true,
  ignorePatterns: ['dist', 'node_modules', '**/dist/**', 'coverage'],
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: null,
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.base.json'],
      },
    },
  },
  overrides: [
    {
      files: ['apps/web/**/*.{ts,tsx}'],
      env: {
        browser: true,
      },
      plugins: ['react', 'react-hooks'],
      extends: [
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:@typescript-eslint/recommended',
      ],
      rules: {
        'react/react-in-jsx-scope': 'off',
        'import/default': 'off',
        'import/no-named-as-default-member': 'off',
      },
    },
    {
      files: ['**/*.spec.ts', '**/*.test.ts'],
      env: {
        jest: true,
      },
    },
  ],
};
