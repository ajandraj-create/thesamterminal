import { defineConfig } from "eslint/config";
import next from "eslint-config-next";

export default defineConfig([
  ...next,
  {
    ignores: [".next/**", "node_modules/**", "coverage/**"],
  },
  {
    rules: {
      // React-Compiler-era advisories introduced by the Next 16 config upgrade.
      // They flag long-standing patterns (inline sub-components, localStorage
      // hydration via setState-in-effect) that predate this ruleset. Kept
      // visible as warnings — tracked tech debt, not CI blockers.
      "react-hooks/static-components": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/use-memo": "warn",
    },
  },
]);
