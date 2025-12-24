"use client";

import { useState } from "react";
import Link from "next/link";
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Menu, Leaf } from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import {buttonVariants} from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/navbar/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

interface RouteProps {
    href: string;
    label: string;
}

export const Navbar = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { t } = useLanguage();
    
    const routeList: RouteProps[] = [
        {
            href: "#features",
            label: t("common.features"),
        },
        {
            href: "#testimonials",
            label: t("common.testimonials"),
        },
        {
            href: "#pricing",
            label: t("common.pricing"),
        },
        {
            href: "#faq",
            label: t("common.faq"),
        },
    ];
    
    return (
        <header className="sticky border-b-[1px] top-0 z-40 w-full bg-white dark:border-b-slate-700 dark:bg-background" suppressHydrationWarning>
            <NavigationMenu className="mx-auto">
                <NavigationMenuList className="container h-14 px-2 sm:px-4 w-screen flex justify-between items-center gap-2" suppressHydrationWarning>
                    <NavigationMenuItem className="font-bold flex">
                        <a
                            rel="noreferrer noopener"
                            href="/"
                            className="ml-2 font-bold text-xl flex items-center gap-2"
                        >
                            <Leaf className="w-6 h-6 text-green-600" />
                            <span className="bg-gradient-to-r from-green-600 to-emerald-600 text-transparent bg-clip-text">
                                EcoMonitor
                            </span>
                        </a>
                    </NavigationMenuItem>

                    {/* mobile */}
                    <span className="flex md:hidden items-center gap-2">
            <LanguageSwitcher />
            <ModeToggle />

            <Sheet
                open={isOpen}
                onOpenChange={setIsOpen}
            >
              <SheetTrigger className="px-2">
                <Menu
                    className="flex md:hidden h-5 w-5"
                    onClick={() => setIsOpen(true)}
                >
                  <span className="sr-only">Menu Icon</span>
                </Menu>
              </SheetTrigger>

              <SheetContent side={"left"}>
                <SheetHeader>
                  <SheetTitle className="font-bold text-xl">
                    {t("navbar.ecoMonitor")}
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col justify-center items-center gap-2 mt-4">
                  {routeList.map(({ href, label }: RouteProps) => (
                      <a
                          rel="noreferrer noopener"
                          key={label}
                          href={href}
                          onClick={() => setIsOpen(false)}
                          className={buttonVariants({ variant: "ghost" })}
                      >
                          {label}
                      </a>
                  ))}
                  <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className={buttonVariants({ variant: "ghost" })}
                  >
                      {t("common.signIn")}
                  </Link>
                  <Link
                      href="/signup"
                      onClick={() => setIsOpen(false)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-center py-2 px-4 rounded-md font-medium"
                  >
                      {t("common.signUp")}
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </span>

                    {/* desktop */}
                    <nav className="hidden md:flex gap-1 lg:gap-2">
                        {routeList.map((route: RouteProps, i) => (
                            <a
                                rel="noreferrer noopener"
                                href={route.href}
                                key={i}
                                className={`text-sm lg:text-[17px] ${buttonVariants({
                                    variant: "ghost",
                                })}`}
                            >
                                {route.label}
                            </a>
                        ))}
                    </nav>

                    <div className="hidden md:flex gap-1.5 lg:gap-2 items-center">
                        <Link href="/login">
                            <Button variant="ghost" className="text-sm lg:text-base text-foreground hover:text-primary px-2 lg:px-4 h-9">
                                {t("common.signIn")}
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button className="text-sm lg:text-base bg-green-600 hover:bg-green-700 text-white px-2 lg:px-4 h-9">
                                {t("common.signUp")}
                            </Button>
                        </Link>
                        <LanguageSwitcher />
                        <ModeToggle />
                    </div>
                </NavigationMenuList>
            </NavigationMenu>
        </header>
    );
};