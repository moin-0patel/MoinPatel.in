import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * Layering rules from PRD 29.2 are enforced here, not by convention:
 *
 *   pages/sections  ->  hooks  ->  services  ->  supabaseClient  ->  Supabase
 *
 * FE-01  components/ and sections/ must never import supabaseClient.
 * FE-02  services/ is the only place query construction lives.
 * FE-03  hooks own caching only, so they talk to services, never to transport.
 * FE-08  environment access goes through lib/env.ts.
 */
const supabaseTransportRestriction = {
  patterns: [
    {
      group: ['**/lib/supabaseClient', '@/lib/supabaseClient', '@supabase/supabase-js'],
      message:
        'PRD FE-01/FE-03: only src/services/* may touch the Supabase client. Call a service function instead.',
    },
  ],
}

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'supabase/.temp', 'node_modules'] },

  // Generated file — never hand-edited, never linted (PRD 43.2).
  { ignores: ['src/types/database.types.ts'] },

  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // FE-06: no `any`, anywhere.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // SEC-05: dangerouslySetInnerHTML is prohibited outside the audited renderer.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message: 'PRD SEC-05: dangerouslySetInnerHTML is prohibited outside src/lib/markdown.ts.',
        },
      ],
    },
  },

  // FE-01 / FE-03 — presentation and cache layers are cut off from transport.
  {
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/sections/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', supabaseTransportRestriction],
    },
  },

  // Pages compose sections and hooks; they do not query either.
  {
    files: ['src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', supabaseTransportRestriction],
    },
  },

  // FE-08 — import.meta.env is read in exactly one module.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/env.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'import',
          property: 'meta',
          message:
            'PRD FE-08: read environment variables through src/lib/env.ts, which validates them at startup.',
        },
      ],
    },
  },

  // The audited markdown renderer is the one place sanitised HTML is emitted.
  {
    files: ['src/lib/markdown.ts', 'src/lib/markdown.tsx'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  // Node-side build tooling.
  {
    files: ['vite.config.ts', 'scripts/**/*.ts', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
)
