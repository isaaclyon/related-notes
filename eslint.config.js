import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import svelte from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.svelte'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      },
      globals: {
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        window: 'readonly',
        document: 'readonly',
        HTMLElement: 'readonly',
        HTMLTableElement: 'readonly',
        process: 'readonly',
        NodeJS: 'readonly',
        EditorPosition: 'readonly',
        EditorSelection: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      'no-console': 'off',
      'no-undef': 'off' // TypeScript handles this
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: typescriptParser,
        extraFileExtensions: ['.svelte']
      },
      globals: {
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        window: 'readonly',
        document: 'readonly',
        HTMLElement: 'readonly',
        HTMLTableElement: 'readonly'
      }
    },
    plugins: {
      svelte
    },
    rules: {
      ...svelte.configs.recommended.rules,
      'svelte/no-unused-svelte-ignore': 'warn',
      'no-undef': 'off' // TypeScript/Svelte handles this
    }
  },
  {
    files: ['**/*.test.ts', 'src/__mocks__/**'],
    rules: {
      // In tests/mocks, allow flexible types to avoid intrusive refactors
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off'
    }
  },
  {
    ignores: [
      '.code/**',
      'node_modules/**',
      'dist/**',
      'main.js',
      '**/*.js.map',
      'test-vault/**',
      'eslint.config.js',
      'vite.config.ts',
      'jest.config.js'
    ]
  }
]
