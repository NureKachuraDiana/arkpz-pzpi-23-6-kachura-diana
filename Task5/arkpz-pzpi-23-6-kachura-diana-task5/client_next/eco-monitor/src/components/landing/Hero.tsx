"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { HeroCards } from "@/components/landing/HeroCards";
import { Leaf, BarChart3, Shield, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const Hero = () => {
    const { t } = useLanguage();
    
    return (
        <section className="container grid lg:grid-cols-2 place-items-center py-20 md:py-32 gap-10">
            <div className="text-center lg:text-start space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium mb-4">
                    <Leaf className="w-4 h-4" />
                    <span>{t("hero.badge")}</span>
                </div>
                
                <main className="text-5xl md:text-6xl font-bold">
                    <h1 className="inline">
                        <span className="bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600 text-transparent bg-clip-text">
                        EcoMonitor
                        </span>
                        <br />
                        <span className="block">
                        {t("hero.title")}
                        </span>
                    </h1>
                </main>

                <p className="text-xl text-muted-foreground md:w-10/12 mx-auto lg:mx-0">
                    {t("hero.description")}
                </p>

                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                    <Link href="/signup">
                        <Button size="lg" className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white">
                            {t("common.getStartedFree")}
                            <Zap className="ml-2 w-4 h-4" />
                        </Button>
                    </Link>
                    <Link href="#features">
                        <Button 
                            variant="outline" 
                            size="lg"
                            className="w-full md:w-auto"
                        >
                            {t("common.learnMore")}
                            <BarChart3 className="ml-2 w-4 h-4" />
                        </Button>
                    </Link>
                </div>

                <div className="flex flex-wrap gap-6 justify-center lg:justify-start pt-4">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-muted-foreground">{t("hero.secureReliable")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-muted-foreground">{t("hero.realTimeAnalytics")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Leaf className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-muted-foreground">{t("hero.ecoFriendly")}</span>
                    </div>
                </div>
            </div>

            {/* Hero cards sections */}
            <div className="z-10">
                <HeroCards />
            </div>

            {/* Shadow effect */}
            <div className="landing-bg-glow"></div>
        </section>
    );
};