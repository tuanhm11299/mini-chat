// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt({
  rules: {
    'vue/multi-word-component-names': 'off',
    // Formatting is Prettier's job.
    'vue/html-self-closing': 'off',
  },
});
