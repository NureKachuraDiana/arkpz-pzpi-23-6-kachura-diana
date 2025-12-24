"use client"

import * as React from "react"
import { Bell } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { NotificationsDropdown, type Notification } from "./NotificationsDropdown"
import { cn } from "@/lib/utils"

interface NotificationBellProps {
  notifications: Notification[]
  onMarkAsRead?: (id: string) => void
  onAcceptRequest?: (id: string) => void
  onDeclineRequest?: (id: string) => void
  className?: string
}

export function NotificationBell({
  notifications,
  onMarkAsRead,
  onAcceptRequest,
  onDeclineRequest,
  className,
}: NotificationBellProps) {
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative text-muted-foreground transition-colors hover:text-foreground hover:bg-accent",
            className
          )}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto border-0 p-0">
        <NotificationsDropdown
          notifications={notifications}
          onMarkAsRead={onMarkAsRead}
          onAcceptRequest={onAcceptRequest}
          onDeclineRequest={onDeclineRequest}
        />
      </PopoverContent>
    </Popover>
  )
}

