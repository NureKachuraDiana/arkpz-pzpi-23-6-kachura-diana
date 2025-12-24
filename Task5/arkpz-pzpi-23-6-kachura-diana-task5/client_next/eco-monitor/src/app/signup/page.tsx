"use client"

import { useLayoutEffect } from "react"
import { SignupForm } from "@/components/forms/signup-form"

export default function Page() {
    useLayoutEffect(() => {
        // Ensure landing theme is removed on signup page immediately
        document.body.classList.remove("landing-theme")
        // Reset body display to block to prevent flex layout issues
        document.body.style.display = "block"
        document.body.style.flexDirection = ""
        
        return () => {
            // Cleanup on unmount
        }
    }, [])

    return (
        <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
            <div className="w-full max-w-sm">
                <SignupForm />
            </div>
        </div>
    )
}
