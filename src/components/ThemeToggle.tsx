import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { cn } from '../utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 bg-[#F5F5F4] dark:bg-zinc-800 p-1 rounded-xl border border-[#141414]/5 dark:border-white/5">
      <button
        onClick={() => setTheme('light')}
        className={cn(
          "flex-1 p-2 rounded-lg flex items-center justify-center transition-all",
          theme === 'light' 
            ? "bg-white dark:bg-zinc-700 text-[#141414] dark:text-white shadow-sm" 
            : "text-[#141414]/40 dark:text-zinc-400 hover:text-[#141414] dark:hover:text-zinc-200"
        )}
        title="Modo Claro"
      >
        <Sun size={16} />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={cn(
          "flex-1 p-2 rounded-lg flex items-center justify-center transition-all",
          theme === 'system' 
            ? "bg-white dark:bg-zinc-700 text-[#141414] dark:text-white shadow-sm" 
            : "text-[#141414]/40 dark:text-zinc-400 hover:text-[#141414] dark:hover:text-zinc-200"
        )}
        title="Sistema"
      >
        <Monitor size={16} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          "flex-1 p-2 rounded-lg flex items-center justify-center transition-all",
          theme === 'dark' 
            ? "bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm" 
            : "text-[#141414]/40 dark:text-zinc-400 hover:text-[#141414] dark:hover:text-zinc-200"
        )}
        title="Modo Escuro"
      >
        <Moon size={16} />
      </button>
    </div>
  );
}
