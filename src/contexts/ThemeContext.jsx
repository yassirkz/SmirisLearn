import { createContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  
  const getThemeKey = (userId) => {
    return userId ? `theme_${userId}` : 'theme_default';
  };

  const [theme, setTheme] = useState(() => {
    // Par défaut, système
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Dès qu'on a le user, on charge sa préférence
  useEffect(() => {
    const key = getThemeKey(user?.id);
    const savedTheme = localStorage.getItem(key);
    
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(systemPreference);
    }
  }, [user?.id]);

  // Appliquer le thème sur le root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    const key = getThemeKey(user?.id);
    localStorage.setItem(key, theme);
  }, [theme, user?.id]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};