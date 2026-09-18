import { create } from "zustand";

type ThemeState = {
  primaryColor: string; // hex like #0A84FF
  logoUrl?: string | null;

  setTheme: (t: {
    primaryColor?: string | null;
    logoUrl?: string | null;
  }) => void;
  resetTheme: () => void;
};

const DEFAULT_PRIMARY = "#0f6324";

export const useThemeStore = create<ThemeState>((set) => ({
  primaryColor: DEFAULT_PRIMARY,
  logoUrl: null,

  setTheme: (t) =>
    set((s) => ({
      primaryColor: t.primaryColor ?? s.primaryColor ?? DEFAULT_PRIMARY,
      logoUrl: t.logoUrl ?? s.logoUrl ?? null,
    })),

  resetTheme: () =>
    set({
      primaryColor: DEFAULT_PRIMARY,
      logoUrl: null,
    }),
}));
