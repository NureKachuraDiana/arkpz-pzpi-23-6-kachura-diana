"use client";

import { useLayoutEffect } from "react";
import { SettingsForm } from "@/components/forms/settings-form";

export default function SettingsPage() {
  useLayoutEffect(() => {
    // Ensure landing theme is removed on settings page immediately
    document.body.classList.remove("landing-theme");
    // Reset body display to block to prevent flex layout issues
    document.body.style.display = "block";
    document.body.style.flexDirection = "";

    return () => {
      // Cleanup on unmount
    };
  }, []);

  return (
    <div className="flex min-h-svh w-full items-start justify-center bg-background p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-3xl">
        <SettingsForm />
      </div>
    </div>
  );
}

