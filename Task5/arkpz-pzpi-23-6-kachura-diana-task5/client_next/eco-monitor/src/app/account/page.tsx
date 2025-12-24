"use client";

import { useLayoutEffect } from "react";
import { AccountForm } from "@/components/forms/account-form";

export default function AccountPage() {
  useLayoutEffect(() => {
    // Ensure landing theme is removed on account page immediately
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
      <div className="w-full max-w-2xl">
        <AccountForm />
      </div>
    </div>
  );
}

