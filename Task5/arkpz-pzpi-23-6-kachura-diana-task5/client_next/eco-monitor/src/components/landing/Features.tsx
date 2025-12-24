"use client";

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import image from "@/assets/growth.png";
import image3 from "@/assets/reflecting.png";
import image4 from "@/assets/looking-ahead.png";
import {Badge} from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface FeatureProps {
    title: string;
    description: string;
    image: string;
}

export const Features = () => {
    const { t } = useLanguage();
    
    const features: FeatureProps[] = [
        {
            title: t("features.items.airQuality.title"),
            description: t("features.items.airQuality.description"),
            image: image4,
        },
        {
            title: t("features.items.waterQuality.title"),
            description: t("features.items.waterQuality.description"),
            image: image3,
        },
        {
            title: t("features.items.aiInsights.title"),
            description: t("features.items.aiInsights.description"),
            image: image,
        },
    ];

    const featureList: string[] = [
        t("features.list.realTimeMonitoring"),
        t("features.list.dataAnalytics"),
        t("features.list.alertSystem"),
        t("features.list.historicalReports"),
        t("features.list.multiSensorSupport"),
        t("features.list.mobileApp"),
        t("features.list.apiIntegration"),
        t("features.list.customDashboards"),
        t("features.list.environmentalForecasting"),
    ];
    
    return (
        <section
            id="features"
            className="container py-24 sm:py-32 space-y-8"
        >
            <h2 className="text-3xl lg:text-4xl font-bold md:text-center">
                {t("features.title")}
            </h2>

            <div className="flex flex-wrap md:justify-center gap-4">
                {featureList.map((feature: string) => (
                    <div key={feature}>
                        <Badge
                            variant="secondary"
                            className="text-sm"
                        >
                            {feature}
                        </Badge>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {features.map(({ title, description, image }: FeatureProps) => (
                    <Card key={title}>
                        <CardHeader>
                            <CardTitle>{title}</CardTitle>
                        </CardHeader>

                        <CardContent>{description}</CardContent>

                        <CardFooter>
                            <img
                                src={image}
                                alt="About feature"
                                className="w-[200px] lg:w-[300px] mx-auto"
                            />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </section>
    );
};