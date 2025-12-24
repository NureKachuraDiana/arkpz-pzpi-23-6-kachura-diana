"use client"

import * as React from "react"
import { Calendar } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { NotificationBell } from "./NotificationBell"
import type { Notification } from "./NotificationsDropdown"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { UserMenu } from "./UserMenu"
import { ModeToggle } from "@/components/landing/mode-toggle"
import { cn } from "@/lib/utils"

interface NavbarActionsProps {
  notifications: Notification[]
  onMarkAsRead?: (id: string) => void
  onAcceptRequest?: (id: string) => void
  onDeclineRequest?: (id: string) => void
  onLanguageChange?: (lang: "en" | "ua") => void
  onLogout?: () => void
  className?: string
}

export function NavbarActions({
  notifications,
  onMarkAsRead,
  onAcceptRequest,
  onDeclineRequest,
  onLanguageChange,
  onLogout,
  className,
}: NavbarActionsProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    undefined
  )

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Calendar */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
          >
            <Calendar className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Notifications */}
      <NotificationBell
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        onAcceptRequest={onAcceptRequest}
        onDeclineRequest={onDeclineRequest}
      />

      {/* Language Switcher */}
      <LanguageSwitcher onChange={onLanguageChange} className={className} />

      {/* Theme Toggle */}
      <ModeToggle />

      {/* User Menu */}
      <UserMenu onLogout={onLogout} />
    </div>
  )
}

