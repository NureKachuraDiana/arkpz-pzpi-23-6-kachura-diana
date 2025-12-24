"use client";

import {Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {JSX} from "react";
import {GiftIcon, MapIcon, MedalIcon, PlaneIcon} from "@/components/landing/Icons";
import { useLanguage } from "@/contexts/LanguageContext";

interface FeatureProps {
    icon: JSX.Element;
    title: string;
    description: string;
}

export const HowItWorks = () => {
    const { t } = useLanguage();
    
    const features: FeatureProps[] = [
        {
            icon: <MedalIcon />,
            title: t("howItWorks.steps.deploy.title"),
            description: t("howItWorks.steps.deploy.description"),
        },
        {
            icon: <MapIcon />,
            title: t("howItWorks.steps.collect.title"),
            description: t("howItWorks.steps.collect.description"),
        },
        {
            icon: <PlaneIcon />,
            title: t("howItWorks.steps.analyze.title"),
            description: t("howItWorks.steps.analyze.description"),
        },
        {
            icon: <GiftIcon />,
            title: t("howItWorks.steps.action.title"),
            description: t("howItWorks.steps.action.description"),
        },
    ];
    
    return (
        <section
            id="howItWorks"
            className="container text-center py-24 sm:py-32"
        >
            <h2 className="text-3xl md:text-4xl font-bold ">
                {t("howItWorks.title")}
            </h2>
            <p className="md:w-3/4 mx-auto mt-4 mb-8 text-xl text-muted-foreground">
                {t("howItWorks.description")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map(({ icon, title, description }: FeatureProps) => (
                    <Card
                        key={title}
                        className="bg-muted/50"
                    >
                        <CardHeader>
                            <CardTitle className="grid gap-4 place-items-center">
                                {icon}
                                {title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>{description}</CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
};