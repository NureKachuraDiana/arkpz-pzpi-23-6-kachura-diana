"use client"

import { useLayoutEffect } from "react"
import { GalleryVerticalEnd } from "lucide-react"

import { LoginForm } from "@/components/forms/login-form"

export default function LoginPage() {
  useLayoutEffect(() => {
    // Ensure landing theme is removed on login page immediately
    document.body.classList.remove("landing-theme")
    // Reset body display to block to prevent flex layout issues
    document.body.style.display = "block"
    document.body.style.flexDirection = ""

    return () => {
      // Cleanup on unmount
    }
  }, [])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Acme Inc.
        </a>
        <LoginForm />
      </div>
    </div>
  )
}
