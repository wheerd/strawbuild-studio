import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import unusedImports from 'eslint-plugin-unused-imports'
import { defineConfig } from 'eslint/config'
import neostandard from 'neostandard'
import tseslint from 'typescript-eslint'

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  tseslint.configs.strictTypeChecked,
  ...neostandard({
    ts: true
  }),
  {
    languageOptions: {
      parserOptions: {
        projectService: true
      }
    }
  },
  eslintConfigPrettier, // This disables all formatting-related ESLint rules
  {
    rules: {
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/no-unnecessary-condition': [
        'error',
        {
          allowConstantLoopConditions: 'only-allowed-literals'
        }
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
          allowNever: true
        }
      ],
      'no-void': 'off',

      '@typescript-eslint/no-invalid-void-type': [
        'error',
        { allowAsThisParameter: true, allowInGenericTypeArguments: true }
      ]
    }
  },
  {
    plugins: {
      'unused-imports': unusedImports
    },
    rules: {
      'no-unused-vars': 'off', // or "@typescript-eslint/no-unused-vars": "off",
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', '*/../*'],
              message: 'Relative imports using ../ are not allowed. Use absolute imports with @ prefix instead.'
            }
          ]
        }
      ],
      '@typescript-eslint/no-explicit-any': 'error'
    }
  },
  {
    // Allow any types in test files for now
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/test/**/*.ts',
      '**/test/**/*.tsx',
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx'
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off'
    }
  }
)
