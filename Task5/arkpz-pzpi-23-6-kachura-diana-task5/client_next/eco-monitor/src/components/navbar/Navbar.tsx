

"use client"

import * as React from "react"
import { NavbarLogo } from "./NavbarLogo"
import { NavbarLinks } from "./NavbarLinks"
import { NavbarActions } from "./NavbarActions"
import {type Notification} from "./NotificationsDropdown"
import { MobileNavbar } from "./MobileNavbar"
import { cn } from "@/lib/utils"

interface NavbarProps {
  notifications?: Notification[]
  onMarkAsRead?: (id: string) => void
  onAcceptRequest?: (id: string) => void
  onDeclineRequest?: (id: string) => void
  onLanguageChange?: (lang: "en" | "ua") => void
  onLogout?: () => void
  className?: string
}

export function Navbar({
  notifications = [],
  onMarkAsRead,
  onAcceptRequest,
  onDeclineRequest,
  onLanguageChange,
  onLogout,
  className,
}: NavbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left Section */}
        <div className="flex items-center gap-4 md:gap-6">
          <NavbarLogo />
          <div className="hidden md:block">
            <NavbarLinks />
          </div>
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <MobileNavbar />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <NavbarActions
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            onAcceptRequest={onAcceptRequest}
            onDeclineRequest={onDeclineRequest}
            onLanguageChange={onLanguageChange}
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  )
}

export type { Notification }