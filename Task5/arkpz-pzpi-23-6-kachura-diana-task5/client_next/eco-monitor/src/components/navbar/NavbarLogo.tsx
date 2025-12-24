"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Leaf } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavbarLogoProps {
  className?: string
}

export function NavbarLogo({ className }: NavbarLogoProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push("/")
  }

  return (
    <div
      className={cn("flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity", className)}
      onClick={handleClick}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 dark:bg-green-500">
        <Leaf className="h-5 w-5 text-white" />
      </div>
      <span className="text-lg font-semibold text-foreground">EcoMonitor</span>
    </div>
  )
}

