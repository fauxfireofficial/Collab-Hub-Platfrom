import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  /** When true (auth pages), dark mode is never applied */
  setForceLightMode: (force: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        return savedTheme;
      }
    } catch (e) {
      console.error('[Theme] Failed to read from localStorage:', e);
    }
    return 'system';
  });

  const [isDark, setIsDark] = useState(false);
  const [forceLightMode, setForceLightMode] = useState(false);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
    } catch (e) {
      console.error('[Theme] Failed to save to localStorage:', e);
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    
    const applyTheme = () => {
      let activeDark = false;

      if (!forceLightMode) {
        if (theme === 'dark') {
          activeDark = true;
        } else if (theme === 'system') {
          activeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
      }
      
      if (activeDark) {
        root.classList.add('dark');
        body.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        body.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
      
      setIsDark(activeDark);
    };

    applyTheme();

    if (theme === 'system' && !forceLightMode) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
      } else {
        mediaQuery.addListener(listener);
      }
      
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', listener);
        } else {
          mediaQuery.removeListener(listener);
        }
      };
    }
  }, [theme, forceLightMode]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, setForceLightMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
