import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';

export default [
  {
    ignores: [
      '.nuxt/**',
      '.nuxt-*/**',
      '.output/**',
      'node_modules/**',
      'data/**',
      'reload/**',
      '--port/**'
    ]
  },
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser
      }
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/valid-v-slot': 'off',
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
];
