import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from "@vue/eslint-config-typescript";

const isProduction = process.env.NODE_ENV === "production";

export default defineConfigWithVueTs(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "ios/**",
      "android/**",
    ],
  },
  js.configs.recommended,
  pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,
  {
    // Tooling config files run in Node.
    files: ["*.config.js"],
    languageOptions: { globals: { process: "readonly" } },
  },
  {
    rules: {
      "no-console": isProduction ? "warn" : "off",
      "no-debugger": isProduction ? "warn" : "off",
      "vue/no-deprecated-slot-attribute": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
