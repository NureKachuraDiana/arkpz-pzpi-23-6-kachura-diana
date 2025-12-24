"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export const Statistics = () => {
    const { t } = useLanguage();
    
    interface statsProps {
        quantity: string;
        description: string;
    }

    const stats: statsProps[] = [
        {
            quantity: "2.7K+",
            description: t("statistics.users"),
        },
        {
            quantity: "1.8K+",
            description: t("statistics.subscribers"),
        },
        {
            quantity: "112",
            description: t("statistics.downloads"),
        },
        {
            quantity: "4",
            description: t("statistics.products"),
        },
    ];

    return (
        <section id="statistics">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map(({ quantity, description }: statsProps) => (
                    <div
                        key={description}
                        className="space-y-2 text-center"
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold ">{quantity}</h2>
                        <p className="text-xl text-muted-foreground">{description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};