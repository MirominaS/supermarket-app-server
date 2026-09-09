import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      "uploads/",
      "coverage/",
    ],
  },

  js.configs.recommended,

  {
    files: ["**/*.js"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },

    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      "no-console": "off",

      "no-undef": "error",

      "eqeqeq": ["error", "always"],

      "semi": ["error", "always"],

      "quotes": [
        "error",
        "double",
        {
          avoidEscape: true,
        },
      ],
    },
  },
];