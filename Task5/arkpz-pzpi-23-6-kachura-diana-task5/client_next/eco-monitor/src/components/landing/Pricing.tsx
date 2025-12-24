"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

enum PopularPlanType {
    NO = 0,
    YES = 1,
}

interface PricingProps {
    title: string;
    popular: PopularPlanType;
    price: number;
    description: string;
    buttonText: string;
    benefitList: string[];
}

export const Pricing = () => {
    const { t, language } = useLanguage();
    const { translations } = require("@/i18n");
    const pricingTranslations = translations[language]?.pricing?.plans;
    
    const getBenefits = (plan: "free" | "premium" | "enterprise"): string[] => {
        try {
            const benefits = pricingTranslations?.[plan]?.benefits;
            return Array.isArray(benefits) ? benefits : [];
        } catch {
            return [];
        }
    };
    
    const pricingList: PricingProps[] = [
        {
            title: t("pricing.plans.free.title"),
            popular: 0,
            price: 0,
            description: t("pricing.plans.free.description"),
            buttonText: t("pricing.plans.free.buttonText"),
            benefitList: getBenefits("free"),
        },
        {
            title: t("pricing.plans.premium.title"),
            popular: 1,
            price: 5,
            description: t("pricing.plans.premium.description"),
            buttonText: t("pricing.plans.premium.buttonText"),
            benefitList: getBenefits("premium"),
        },
        {
            title: t("pricing.plans.enterprise.title"),
            popular: 0,
            price: 40,
            description: t("pricing.plans.enterprise.description"),
            buttonText: t("pricing.plans.enterprise.buttonText"),
            benefitList: getBenefits("enterprise"),
        },
    ];
    
    return (
        <section
            id="pricing"
            className="container py-24 sm:py-32"
        >
            <h2 className="text-3xl md:text-4xl font-bold text-center">
                {t("pricing.title")}
            </h2>
            <h3 className="text-xl text-center text-muted-foreground pt-4 pb-8">
                {t("pricing.subtitle")}
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {pricingList.map((pricing: PricingProps) => (
                    <Card
                        key={pricing.title}
                        className={
                            pricing.popular === PopularPlanType.YES
                                ? "drop-shadow-xl shadow-black/10 dark:shadow-white/10"
                                : ""
                        }
                    >
                        <CardHeader>
                            <CardTitle className="flex item-center justify-between">
                                {pricing.title}
                                {pricing.popular === PopularPlanType.YES ? (
                                    <Badge
                                        variant="secondary"
                                        className="text-sm text-primary"
                                    >
                                        {t("pricing.mostPopular")}
                                    </Badge>
                                ) : null}
                            </CardTitle>
                            <div>
                                <span className="text-3xl font-bold">${pricing.price}</span>
                                <span className="text-muted-foreground"> {t("pricing.perMonth")}</span>
                            </div>

                            <CardDescription>{pricing.description}</CardDescription>
                        </CardHeader>

                        <CardContent>
                            <Button className="w-full">{pricing.buttonText}</Button>
                        </CardContent>

                        <hr className="w-4/5 m-auto mb-4" />

                        <CardFooter className="flex">
                            <div className="space-y-4">
                                {pricing.benefitList.map((benefit: string) => (
                                    <span
                                        key={benefit}
                                        className="flex"
                                    >
                    <Check className="text-green-500" />{" "}
                                        <h3 className="ml-2">{benefit}</h3>
                  </span>
                                ))}
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </section>
    );
};