"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

type Props = ToasterProps;

/**
 * Place <Toaster /> once (e.g., in app/layout.tsx or pages/_app.tsx).
 */
const Toaster = ({ ...props }: Props) => {
  // Prefer next-themes, but gracefully handle environments without it.
  const themeHook = (() => {
    try {
      return useTheme();
    } catch {
      return { theme: undefined };
    }
  })();

  const systemPrefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;

  const resolvedTheme =
    (themeHook?.theme as Props["theme"]) ??
    (systemPrefersDark ? "dark" : "light");

  const cssVars =
    resolvedTheme === "dark"
      ? ({
          // dark
          ["--normal-bg"]: "#0f172a", // slate-900
          ["--normal-text"]: "#f8fafc", // slate-50
          ["--normal-border"]: "#334155", // slate-700
        } as React.CSSProperties)
      : ({
          // light
          ["--normal-bg"]: "#ffffff",
          ["--normal-text"]: "#0f172a", // slate-900
          ["--normal-border"]: "#e2e8f0", // slate-200
        } as React.CSSProperties);

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      style={cssVars}
      {...props}
    />
  );
};

export { Toaster };
