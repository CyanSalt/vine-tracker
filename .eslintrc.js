module.exports = {
  root: true,
  extends: [
    '@cyansalt/preset',
  ],
  parserOptions: {
    project: './tsconfig.tools.json',
  },
  overrides: [
    {
      files: ['**/vue/**/*', '**/vue-v2/**/*'],
      rules: {
        'react-hooks/rules-of-hooks': 'off',
      },
    },
  ],
}
