"use client"

import * as React from "react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/LanguageContext"
import type { Role } from "@/api/types"

interface NavLink {
  label: string | (() => string)
  href?: string
  items?: NavLink[]
  roles?: Role[] // Roles that can see this link
}

// Helper function to get navigation links based on current language
function getBaseNavLinks(t: (key: string) => string): NavLink[] {
  return [
    {
      label: () => t("navbar.links.stations"),
      items: [
        { label: () => t("navbar.links.allStations"), href: "/stations" },
        { label: () => t("navbar.links.allSensors"), href: "/admin/sensors", roles: ["ADMIN"] },
      ],
    },
    {
      label: () => t("navbar.links.readings"),
      items: [
        { label: () => t("navbar.links.viewReadings"), href: "/readings" }
      ],
      roles: ["ADMIN"],
    },
  ]
}

// Admin-only navigation links
function getAdminNavLinks(t: (key: string) => string): NavLink[] {
  return [
    {
      label: () => t("navbar.links.dashboard"),
      href: "/admin/dashboard",
    },
    {
      label: () => t("navbar.links.admin"),
      items: [
        { label: () => t("navbar.links.users"), href: "/admin/users", roles: ["ADMIN"] },
        { label: () => t("navbar.links.backups"), href: "/admin/backups", roles: ["ADMIN"] },
        { label: () => t("navbar.links.notificationTemplates"), href: "/admin/notification-templates", roles: ["ADMIN"] },
      ],
      roles: ["ADMIN"],
    },
  ]
}

// Operator navigation links
function getOperatorNavLinks(t: (key: string) => string): NavLink[] {
  return [
    {
      label: () => t("navbar.links.operations"),
      items: [
        { label: () => t("navbar.links.maintenance"), href: "/operations/maintenance", roles: ["OPERATOR", "ADMIN"] },
        { label: () => t("navbar.links.alerts"), href: "/operations/alerts", roles: ["OPERATOR", "ADMIN"] },
        { label: () => t("navbar.links.exports"), href: "/operations/exports", roles: ["OPERATOR"] },
      ],
      roles: ["OPERATOR", "ADMIN"],
    },
  ]
}

function getNavLinksForRole(role: Role, t: (key: string) => string): NavLink[] {
  const links: NavLink[] = [...getBaseNavLinks(t)];

  // Add role-specific links
  if (role === "ADMIN" || role === "OPERATOR") {
    links.push(...getOperatorNavLinks(t));
  }

  if (role === "ADMIN") {
    links.push(...getAdminNavLinks(t));
  }

  return links;
}

interface NavbarLinksProps {
  className?: string
  onLinkClick?: () => void
}

function canAccessLink(link: NavLink, userRole: Role): boolean {
  if (!link.roles || link.roles.length === 0) {
    return true; // No role restriction
  }
  return link.roles.includes(userRole);
}

export function NavbarLinks({ className, onLinkClick }: NavbarLinksProps) {
  const { user, hasRole } = useAuth();
  const { t } = useLanguage();

  if (!user) {
    return null;
  }

  const navLinks = getNavLinksForRole(user.role, t);

  return (
    <nav className={cn("hidden items-center gap-1 md:flex", className)}>
      {navLinks
        .filter((link) => canAccessLink(link, user.role))
        .map((link) => {
          if (link.items) {
            const accessibleItems = link.items.filter((item) =>
              canAccessLink(item, user.role)
            );

            if (accessibleItems.length === 0) {
              return null;
            }

            const labelText = typeof link.label === "function" ? link.label() : link.label;
            return (
              <DropdownMenu key={labelText}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
                  >
                    {labelText}
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {accessibleItems.map((item) => {
                    const itemLabel = typeof item.label === "function" ? item.label() : item.label;
                    return (
                      <DropdownMenuItem key={itemLabel} asChild>
                        <Link
                          href={item.href || "#"}
                          onClick={onLinkClick}
                          className="cursor-pointer"
                        >
                          {itemLabel}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          const labelText = typeof link.label === "function" ? link.label() : link.label;
          return (
            <Button
              key={labelText}
              variant="ghost"
              asChild
              className="text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            >
              <Link href={link.href || "#"} onClick={onLinkClick}>
                {labelText}
              </Link>
            </Button>
          );
        })}
    </nav>
  );
}

