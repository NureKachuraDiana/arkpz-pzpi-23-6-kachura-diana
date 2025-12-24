"use client";

import { MagnifierIcon, WalletIcon, ChartIcon } from "./Icons";
import Image from "next/image";
import React, { JSX } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

interface ServiceProps {
    title: string;
    description: string;
    icon: JSX.Element;
}

export const Services = () => {
    const { t } = useLanguage();
    
    const serviceList: ServiceProps[] = [
        {
            title: t("services.items.analytics.title"),
            description: t("services.items.analytics.description"),
            icon: <ChartIcon />,
        },
        {
            title: t("services.items.management.title"),
            description: t("services.items.management.description"),
            icon: <WalletIcon />,
        },
        {
            title: t("services.items.detection.title"),
            description: t("services.items.detection.description"),
            icon: <MagnifierIcon />,
        },
    ];
    
    return (
        <section className="container py-24 sm:py-32">
            <div className="grid lg:grid-cols-[1fr,1fr] gap-8 place-items-center">
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold">
                        {t("services.title")}
                    </h2>

                    <p className="text-muted-foreground text-xl mt-4 mb-8 ">
                        {t("services.description")}
                    </p>

                    <div className="flex flex-col gap-8">
                        {serviceList.map(({ icon, title, description }: ServiceProps) => (
                            <Card key={title}>
                                <CardHeader className="space-y-1 flex md:flex-row justify-start items-start gap-4">
                                    <div className="mt-1 bg-primary/20 p-1 rounded-2xl">
                                        {icon}
                                    </div>
                                    <div>
                                        <CardTitle>{title}</CardTitle>
                                        <CardDescription className="text-md mt-2">
                                            {description}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Контейнер с наложенными изображениями */}
                <div className="relative w-[300px] md:w-[500px] lg:w-[600px] h-[300px] md:h-[400px]">
                    {/* Первое изображение - сзади */}
                    <img
                        src="/sensorHumidity.png"
                        className="absolute top-0 left-0 w-2/3 object-contain
                   transform -rotate-6 shadow-lg rounded-lg z-10
                   border-2 border-white/20"
                        alt="Temperature Sensor"
                    />

                    {/* Второе изображение - посередине */}
                    <img
                        src="/sensorTemperature.png"
                        className="absolute top-1/4 left-1/4 w-2/3 object-contain
                   transform rotate-3 shadow-lg rounded-lg z-20
                   border-2 border-white/20"
                        alt="Humidity Sensor"
                    />

                    {/* Третье изображение - спереди */}
                    <img
                        src="/sensorMQ2.png"
                        className="absolute top-1/2 left-1/2 w-2/3 object-contain
                   transform -rotate-2 shadow-lg rounded-lg z-30
                   border-2 border-white/20"
                        alt="MQ2 Gas Sensor"
                    />
                </div>
            </div>
        </section>
    );
};