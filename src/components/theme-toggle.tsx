"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Sparkles } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch by waiting until mounted on the client
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-[120px] h-[38px] rounded-lg border border-border bg-card animate-pulse" />;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-1 bg-card">
      <button
        onClick={() => setTheme("light")}
        className={`p-2 rounded-md transition-colors ${theme === "light" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
        aria-label="Light theme"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-2 rounded-md transition-colors ${theme === "dark" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
        aria-label="Dark theme"
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("theme-cyberpunk")}
        className={`p-2 rounded-md transition-colors ${theme === "theme-cyberpunk" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
        aria-label="Cyberpunk theme"
      >
        <Sparkles className="h-4 w-4" />
      </button>
    </div>
  );
}
