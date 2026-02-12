import js from '@eslint/js'import js from '@eslint/js'

import globals from 'globals'import globals from 'globals'

import reactHooks from 'eslint-plugin-react-hooks'import reactHooks from 'eslint-plugin-react-hooks'

import reactRefresh from 'eslint-plugin-react-refresh'import reactRefresh from 'eslint-plugin-react-refresh'

import tseslint from 'typescript-eslint'import tseslint from 'typescript-eslint'

import { defineConfig, globalIgnores } from 'eslint/config'

export default tseslint.config(

  { ignores: ['dist'] },export default defineConfig([

  {  globalIgnores(['dist']),

    extends: [js.configs.recommended, ...tseslint.configs.recommended],  {

    files: ['**/*.{ts,tsx}'],    files: ['**/*.{ts,tsx}'],

    languageOptions: {    extends: [

      ecmaVersion: 2020,      js.configs.recommended,

      globals: globals.browser,      tseslint.configs.recommended,

    },      reactHooks.configs.flat.recommended,

    plugins: {      reactRefresh.configs.vite,

      'react-hooks': reactHooks,    ],

      'react-refresh': reactRefresh,    languageOptions: {

    },      ecmaVersion: 2020,

    rules: {      globals: globals.browser,

      ...reactHooks.configs.recommended.rules,    },

      'react-refresh/only-export-components': [  },

        'warn',])

        { allowConstantExport: true },
      ],
    },
  },
)
