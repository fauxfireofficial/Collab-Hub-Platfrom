import React, { useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

/** Keeps login/register and other public auth screens in light mode only */
export const AuthThemeGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setForceLightMode } = useTheme();

  useEffect(() => {
    setForceLightMode(true);
    return () => setForceLightMode(false);
  }, [setForceLightMode]);

  return <>{children}</>;
};
