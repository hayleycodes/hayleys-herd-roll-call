import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores(['dist']),

    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: globals.browser,
        },
        plugins: {
            react,
        },
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            tseslint.configs.stylistic,
            react.configs.flat.recommended,
            react.configs.flat['jsx-runtime'],
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
            prettier,
        ],
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            // The codebase deliberately uses `type` aliases (including the
            // generated database.types.ts, which can't be hand-edited), so the
            // stylistic `interface`/`Record` preferences from
            // tseslint.configs.stylistic don't apply here.
            '@typescript-eslint/consistent-type-definitions': 'off',
            '@typescript-eslint/consistent-indexed-object-style': 'off',
            // The UI copy is casual and apostrophe-heavy; escaping every one as
            // &apos; hurts readability more than it helps.
            'react/no-unescaped-entities': 'off',
        },
    },
]);
