/**
 * Theme Store
 * Manages color themes and visualization settings
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeConfig, SimulationColors } from '../types';
import { themes, darkTheme } from '../types';

interface ThemeStore {
  // Current theme
  currentTheme: ThemeConfig;
  themeName: string;

  // Custom color overrides
  colorOverrides: Partial<SimulationColors>;

  // Cached merged colors (avoids creating new objects on every access)
  colors: SimulationColors;

  // Actions
  setTheme: (name: string) => void;
  setCustomTheme: (theme: ThemeConfig) => void;
  setColorOverride: (key: keyof SimulationColors, value: string) => void;
  clearOverrides: () => void;
}

// Helper to merge colors
const mergeColors = (
  theme: ThemeConfig,
  overrides: Partial<SimulationColors>
): SimulationColors => ({
  ...theme.colors,
  ...overrides,
});

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      currentTheme: darkTheme,
      themeName: 'dark',
      colorOverrides: {},
      colors: darkTheme.colors,

      setTheme: (name) => {
        const theme = themes[name];
        if (theme) {
          set((state) => ({
            currentTheme: theme,
            themeName: name,
            colors: mergeColors(theme, state.colorOverrides),
          }));
        }
      },

      setCustomTheme: (theme) => {
        set((state) => ({
          currentTheme: theme,
          themeName: 'custom',
          colors: mergeColors(theme, state.colorOverrides),
        }));
      },

      setColorOverride: (key, value) => {
        set((state) => {
          const newOverrides = { ...state.colorOverrides, [key]: value };
          return {
            colorOverrides: newOverrides,
            colors: mergeColors(state.currentTheme, newOverrides),
          };
        });
      },

      clearOverrides: () => {
        set((state) => ({
          colorOverrides: {},
          colors: state.currentTheme.colors,
        }));
      },
    }),
    {
      name: 'simulation-theme',
      partialize: (state) => ({
        themeName: state.themeName,
        colorOverrides: state.colorOverrides,
      }),
      onRehydrateStorage: () => (state) => {
        // Recompute colors after rehydration
        if (state) {
          const theme = themes[state.themeName] ?? darkTheme;
          state.currentTheme = theme;
          state.colors = mergeColors(theme, state.colorOverrides);
        }
      },
    }
  )
);

// Selector hooks for specific colors (stable references)
export const useColors = () => useThemeStore((s) => s.colors);
export const useThemeName = () => useThemeStore((s) => s.themeName);
