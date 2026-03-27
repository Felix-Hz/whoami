import type { ResolveHook } from "node:module";

const ALIASES: Record<string, string> = {
  react: "preact/compat",
  "react-dom": "preact/compat",
  "react/jsx-runtime": "preact/jsx-runtime",
  "react/jsx-dev-runtime": "preact/jsx-runtime",
};

export const resolve: ResolveHook = (specifier, context, nextResolve) => {
  if (specifier in ALIASES) {
    return nextResolve(ALIASES[specifier], context);
  }
  return nextResolve(specifier, context);
};
