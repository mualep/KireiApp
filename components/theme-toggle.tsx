"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-8 rounded-lg text-muted-foreground"
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="size-4 opacity-40" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "Light" : "Dark"} mode`}
      title={`Beralih ke mode ${isDark ? "Terang (Light)" : "Gelap (Dark)"}`}
    >
      {isDark ? (
        <Sun className="size-4 text-amber-400 hover:text-amber-300 transition-colors" />
      ) : (
        <Moon className="size-4 text-slate-700 hover:text-slate-900 transition-colors" />
      )}
    </Button>
  );
}
