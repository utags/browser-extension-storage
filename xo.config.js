/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
  {
    ignores: ["build/**/*"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    space: 2,
    prettier: "compat",
    languageOptions: {
      globals: {
        document: "readonly",
        chrome: "readonly",
        GM: "readonly",
        GM_addValueChangeListener: "readonly",
        GM_removeValueChangeListener: "readonly",
        GM_getValue: "readonly",
        GM_setValue: "readonly",
        GM_deleteValue: "readonly",
        GM_listValues: "readonly",
        GM_registerMenuCommand: "readonly",
        GM_unregisterMenuCommand: "readonly",
        GM_xmlhttpRequest: "readonly",
        GM_setClipboard: "readonly",
        GM_openInTab: "readonly",
        GM_addStyle: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
        {
          selector: "objectLiteralProperty",
          format: null,
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
      ],
      camelcase: 0,
      "new-cap": 0,
      "no-global-assign": 0,
      "prefer-destructuring": 0,
      "capitalized-comments": 0,
      "import-x/extensions": 0,
      "n/file-extension-in-import": 0,
      "@typescript-eslint/prefer-nullish-coalescing": 0,
      "@typescript-eslint/prefer-optional-chain": 0,
      "logical-assignment-operators": 0,
    },
  },
  {
    files: ["lib/**/*.ts"],
    rules: {
      "@stylistic/indent": 0,
      "@stylistic/indent-binary-ops": 0,
    },
  },
]

export default xoConfig
