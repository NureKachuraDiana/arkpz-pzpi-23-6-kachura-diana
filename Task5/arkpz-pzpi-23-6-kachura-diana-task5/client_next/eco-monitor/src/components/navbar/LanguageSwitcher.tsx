"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import type { Language } from "@/i18n/types"

const languages: { code: Language; label: string; fullLabel: string }[] = [
  { code: "en", label: "EN", fullLabel: "English" },
  { code: "ua", label: "UA", fullLabel: "Українська" },
]

interface LanguageSwitcherProps {
  onChange?: (lang: Language) => void
  className?: string
  variant?: "icon" | "text"
}

export function LanguageSwitcher({
  onChange,
  className,
  variant = "icon",
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage()

  const handleChange = (lang: Language) => {
    setLanguage(lang)
    onChange?.(lang)
  }

  if (variant === "text") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "text-sm lg:text-base text-foreground hover:text-primary px-2 lg:px-4 h-9",
              className
            )}
          >
            <Globe className="h-4 w-4 mr-2" />
            {languages.find((l) => l.code === language)?.label || "EN"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={cn(
                "cursor-pointer",
                language === lang.code && "bg-accent"
              )}
            >
              <span className="font-medium">{lang.label}</span>
              <span className="ml-2 text-muted-foreground">{lang.fullLabel}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-muted-foreground transition-colors hover:text-foreground hover:bg-accent",
            className
          )}
        >
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={cn(
              "cursor-pointer",
              language === lang.code && "bg-accent"
            )}
          >
            <span className="font-medium">{lang.label}</span>
            <span className="ml-2 text-muted-foreground">{lang.fullLabel}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

