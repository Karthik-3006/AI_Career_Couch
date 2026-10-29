import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-50 bg-primary-600 hover:bg-primary-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white p-3.5 rounded-full shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center border-2 border-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Bright Mode'}
    >
      {theme === 'light' ? (
        <Moon className="h-5.5 w-5.5 text-white" />
      ) : (
        <Sun className="h-5.5 w-5.5 text-gray-900" />
      )}
    </button>
  );
}
