"use client";

import { Statistics } from "./Statistics";
import pilot from "@/assets/pilot.png";
import { useLanguage } from "@/contexts/LanguageContext";

export const About = () => {
    const { t } = useLanguage();
    
    return (
        <section
            id="about"
            className="container py-24 sm:py-32"
        >
            <div className="bg-muted/50 border rounded-lg py-12">
                <div className="px-6 flex flex-col-reverse md:flex-row gap-8 md:gap-12">
                    <img
                        src={pilot}
                        alt=""
                        className="w-[300px] object-contain rounded-lg"
                    />
                    <div className="bg-green-0 flex flex-col justify-between">
                        <div className="pb-6">
                            <h2 className="text-3xl md:text-4xl font-bold">
                                <span className="bg-gradient-to-b from-green-600 to-emerald-600 text-transparent bg-clip-text">
                                    {t("about.title")}
                                </span>
                            </h2>
                            <p className="text-xl text-muted-foreground mt-4">
                                {t("about.description")}
                            </p>
                        </div>

                        <Statistics />
                    </div>
                </div>
            </div>
        </section>
    );
};