import { createContext } from "react";

export type ThemeMode = "system" | "light" | "dark";

export interface ThemeContextValue {
  /** Valgt tilstand (kan være "system"). */
  mode: ThemeMode;
  /** Den faktisk anvendte tilstand lige nu. */
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const THEME_STORAGE_KEY = "madro-theme";
