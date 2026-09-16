import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  { ignores: [".next/**", "node_modules/**", "assets-source/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-restricted-syntax": [
        "error",
        {
          // Plurals must go through Intl.PluralRules — Serbian and Russian have
          // three forms and a ternary silently renders the wrong one.
          selector:
            "ConditionalExpression[test.operator='==='][test.right.value=1]",
          message: "Use Intl.PluralRules via t.plural() — never `count === 1 ? x : y`.",
        },
      ],
    },
  },
];
