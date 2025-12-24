"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
                                  children,
                                  defaultTheme = "system",
                                  storageKey = "ecomonitor-ui-theme",
                                  ...props
                              }: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(() => {
        // Only access localStorage on client side
        if (typeof window === "undefined") {
            return defaultTheme;
        }
        
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored && (stored === "dark" || stored === "light" || stored === "system")) {
                return stored as Theme;
            }
        } catch (error) {
            console.error("Failed to read theme from localStorage:", error);
        }
        
        return defaultTheme;
    });

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const root = window.document.documentElement;

        root.classList.remove("light", "dark");

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
                .matches
                ? "dark"
                : "light";

            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }
    }, [theme, mounted]);

    // Listen for system theme changes when theme is set to "system"
    useEffect(() => {
        if (!mounted || theme !== "system") return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        
        const handleChange = (e: MediaQueryListEvent) => {
            const root = window.document.documentElement;
            root.classList.remove("light", "dark");
            root.classList.add(e.matches ? "dark" : "light");
        };

        mediaQuery.addEventListener("change", handleChange);
        
        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, [theme, mounted]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        
        if (typeof window !== "undefined") {
            try {
                localStorage.setItem(storageKey, newTheme);
            } catch (error) {
                console.error("Failed to save theme to localStorage:", error);
            }
        }
    };

    const value = {
        theme,
        setTheme,
    };

    return (
        <ThemeProviderContext.Provider
            {...props}
            value={value}
        >
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");

    return context;
};