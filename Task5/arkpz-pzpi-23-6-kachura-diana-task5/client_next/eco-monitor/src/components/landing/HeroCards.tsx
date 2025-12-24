"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import {Check, Globe, Zap, Cloud, Cpu, BarChart, LeafIcon, AlertCircle} from "lucide-react";
import { LightBulbIcon } from "./Icons";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

export const HeroCards = () => {
    const { t, language } = useLanguage();
    const { translations } = require("@/i18n");
    const heroCardsTranslations = translations[language]?.heroCards;
    
    const getBenefits = (): string[] => {
        try {
            const benefits = heroCardsTranslations?.studentPlan?.benefits;
            return Array.isArray(benefits) ? benefits : [];
        } catch {
            return [];
        }
    };
    
    return (
        <div className="hidden lg:flex flex-row flex-wrap gap-8 relative w-[700px] h-[500px]">
            {/* Feature 1: Real-time Monitoring */}
            <Card className="absolute w-[340px] -top-[15px] drop-shadow-xl shadow-black/10 dark:shadow-white/10">
                <CardHeader className="space-y-1 flex md:flex-row justify-start items-start gap-4">
                    <div className="mt-1 bg-blue-500/20 p-3 rounded-2xl">
                        <Zap className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                        <CardTitle>{t("heroCards.realTimeTracking.title")}</CardTitle>
                        <CardDescription className="text-md mt-2">
                            {t("heroCards.realTimeTracking.description")}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Cloud className="h-4 w-4" />
                        <span>{t("heroCards.realTimeTracking.footer")}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Feature 2: Analytics Dashboard */}
            <Card className="absolute right-[20px] top-4 w-80 flex flex-col justify-center items-center drop-shadow-xl shadow-black/10 dark:shadow-white/10">
                <CardHeader className="mt-8 flex justify-center items-center pb-2">
                    <div className="absolute -top-12 bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl">
                        <BarChart className="h-16 w-16 text-white" />
                    </div>
                    <CardTitle className="text-center">{t("heroCards.analytics.title")}</CardTitle>
                    <CardDescription className="font-normal text-primary">
                        {t("heroCards.analytics.subtitle")}
                    </CardDescription>
                </CardHeader>

                <CardContent className="text-center pb-2">
                    <p>
                        {t("heroCards.analytics.description")}
                    </p>
                </CardContent>

                <CardFooter className="flex gap-2">
                    <Badge variant="outline" className="gap-1">
                        <Cpu className="h-3 w-3" /> {t("heroCards.analytics.badges.aiPowered")}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                        <Globe className="h-3 w-3" /> {t("heroCards.analytics.badges.multiSource")}
                    </Badge>
                </CardFooter>
            </Card>

            {/* Pricing - Student Plan */}
            <Card className="absolute top-[150px] left-[50px] w-72 drop-shadow-xl shadow-black/10 dark:shadow-white/10">
                <CardHeader>
                    <CardTitle className="flex item-center justify-between">
                        {t("heroCards.studentPlan.title")}
                        <Badge
                            variant="secondary"
                            className="text-sm text-green-600"
                        >
                            {t("heroCards.studentPlan.badge")}
                        </Badge>
                    </CardTitle>
                    <div>
                        <span className="text-3xl font-bold">{t("heroCards.studentPlan.price")}</span>
                        <span className="text-muted-foreground"> {t("heroCards.studentPlan.period")}</span>
                    </div>

                    <CardDescription>
                        {t("heroCards.studentPlan.description")}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                        <LeafIcon className="mr-2 h-4 w-4" />
                        {t("heroCards.studentPlan.button")}
                    </Button>
                </CardContent>

                <hr className="w-4/5 m-auto mb-4" />

                <CardFooter className="flex">
                    <div className="space-y-4">
                        {getBenefits().map(
                            (benefit: string) => (
                                <span
                                    key={benefit}
                                    className="flex"
                                >
                                    <Check className="text-green-500" />
                                    <h3 className="ml-2 text-sm">{benefit}</h3>
                                </span>
                            )
                        )}
                    </div>
                </CardFooter>
            </Card>

            {/* Feature 3: Alert System */}
            <Card className="absolute w-[350px] -right-[10px] bottom-[35px] drop-shadow-xl shadow-black/10 dark:shadow-white/10">
                <CardHeader className="space-y-1 flex md:flex-row justify-start items-start gap-4">
                    <div className="mt-1 bg-red-500/20 p-3 rounded-2xl">
                        <AlertCircle className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                        <CardTitle>{t("heroCards.alertSystem.title")}</CardTitle>
                        <CardDescription className="text-md mt-2">
                            {t("heroCards.alertSystem.description")}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{t("heroCards.alertSystem.badges.aqiAlerts")}</Badge>
                        <Badge variant="secondary">{t("heroCards.alertSystem.badges.pollutionPeaks")}</Badge>
                        <Badge variant="secondary">{t("heroCards.alertSystem.badges.weatherWarnings")}</Badge>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};