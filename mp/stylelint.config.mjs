/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'selector-class-pattern': null,
    'no-descending-specificity': null,
    'at-rule-no-unknown': [true, { ignoreAtRules: ['tailwind'] }],
  },
};
