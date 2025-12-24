"use client"

import * as React from "react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  User,
  Settings,
  Users,
  UserPlus,
  LogOut,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/LanguageContext"

interface UserMenuProps {
  onLogout?: () => void
  className?: string
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>
  label: string | (() => string)
  href: string
  roles?: string[]
}

// Helper functions to get menu items based on current language
function getBaseMenuItems(t: (key: string) => string): MenuItem[] {
  return [
    { icon: User, label: () => t("navbar.userMenu.myAccount"), href: "/account" },
    { icon: Settings, label: () => t("navbar.userMenu.settings"), href: "/settings" },
  ]
}

function getAdminMenuItems(t: (key: string) => string): MenuItem[] {
  return [
    { icon: Users, label: () => t("navbar.userMenu.manageUsers"), href: "/admin/users", roles: ["ADMIN"] },
    { icon: Shield, label: () => t("navbar.userMenu.adminPanel"), href: "/admin", roles: ["ADMIN"] },
  ]
}

function getOperatorMenuItems(t: (key: string) => string): MenuItem[] {
  return [
    { icon: UserPlus, label: () => t("navbar.userMenu.operations"), href: "/operations", roles: ["OPERATOR", "ADMIN"] },
  ]
}

export function UserMenu({
  onLogout,
  className,
}: UserMenuProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) {
    return null;
  }

  const userName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || user.lastName || t("navbar.userMenu.user");
  const userEmail = user.email;

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const allMenuItems = [
    ...getBaseMenuItems(t),
    ...(user.role === "ADMIN" || user.role === "OPERATOR" ? getOperatorMenuItems(t) : []),
    ...(user.role === "ADMIN" ? getAdminMenuItems(t) : []),
  ];

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
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-3 p-2">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{userName}</span>
            <span className="text-xs text-muted-foreground">{userEmail}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        {allMenuItems.map((item) => {
          const Icon = item.icon
          const labelText = typeof item.label === "function" ? item.label() : item.label;
          return (
            <DropdownMenuItem key={labelText} asChild>
              <Link
                href={item.href}
                className="flex cursor-pointer items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                <span>{labelText}</span>
              </Link>
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t("navbar.userMenu.logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

