"use client"

import * as React from "react"
import { Menu, X } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { NavbarLogo } from "./NavbarLogo"
import { NavbarLinks } from "./NavbarLinks"
import Link from "next/link"

interface MobileNavbarProps {
  className?: string
}

export function MobileNavbar({ className }: MobileNavbarProps) {
  const [open, setOpen] = React.useState(false)

  const navLinks = [
    {
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      label: "Campaigns",
      items: [
        { label: "All Campaigns", href: "/campaigns" },
        { label: "Create Campaign", href: "/campaigns/create" },
        { label: "Analytics", href: "/campaigns/analytics" },
      ],
    },
    {
      label: "Reports",
      items: [
        { label: "View Reports", href: "/reports" },
        { label: "Generate Report", href: "/reports/generate" },
      ],
    },
    {
      label: "Settings",
      href: "/settings",
    },
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>
            <NavbarLogo />
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-8 flex flex-col gap-2">
          {navLinks.map((link) => {
            if (link.items) {
              return (
                <DropdownMenu key={link.label}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between text-left"
                    >
                      {link.label}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {link.items.map((item) => (
                      <DropdownMenuItem key={item.label} asChild>
                        <Link
                          href={item.href || "#"}
                          onClick={() => setOpen(false)}
                          className="cursor-pointer"
                        >
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            }

            return (
              <Button
                key={link.label}
                variant="ghost"
                asChild
                className="w-full justify-start"
                onClick={() => setOpen(false)}
              >
                <Link href={link.href || "#"}>{link.label}</Link>
              </Button>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

