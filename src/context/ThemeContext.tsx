import React, { createContext, useContext, useState } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: {
    background: string;
    cardBg: string;
    textPrimary: string;
    textSecondary: string;
    header: string;
    inputBg: string;
    inputBorder: string;
    border: string;
    inputText: string;
    primary: string;
    emptyCardBg: string;
  };
}

export const lightTheme = {
  background: '#FAFBFD',
  cardBg: '#FFFFFF',
  textPrimary: '#0D47A1',
  textSecondary: '#546E7A',
  header: '#0D47A1',
  inputBg: '#FFFFFF',
  inputBorder: '#E0E1E6',
  border: '#E7EEF5',
  inputText: '#111827',
  primary: '#1565C0',
  emptyCardBg: '#F4F8FB',
};

export const darkTheme = {
  background: '#0B132B',
  cardBg: '#1C2541',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  header: '#1C2541',
  inputBg: '#1C2541',
  inputBorder: '#334155',
  border: '#334155',
  inputText: '#F8FAFC',
  primary: '#2563EB',
  emptyCardBg: '#1E293B',
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  theme: lightTheme,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

