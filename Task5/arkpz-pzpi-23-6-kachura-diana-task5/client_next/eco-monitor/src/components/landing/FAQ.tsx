"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";

interface FAQProps {
    question: string;
    answer: string;
    value: string;
}

export const FAQ = () => {
    const { t } = useLanguage();
    
    const FAQList: FAQProps[] = [
        {
            question: t("faq.items.whatIs.question"),
            answer: t("faq.items.whatIs.answer"),
            value: "item-1",
        },
        {
            question: t("faq.items.parameters.question"),
            answer: t("faq.items.parameters.answer"),
            value: "item-2",
        },
        {
            question: t("faq.items.realTime.question"),
            answer: t("faq.items.realTime.answer"),
            value: "item-3",
        },
        {
            question: t("faq.items.whoCanUse.question"),
            answer: t("faq.items.whoCanUse.answer"),
            value: "item-4",
        },
        {
            question: t("faq.items.security.question"),
            answer: t("faq.items.security.answer"),
            value: "item-5",
        },
    ];
    
    return (
        <section
            id="faq"
            className="container py-24 sm:py-32"
        >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t("faq.title")}
            </h2>

            <Accordion
                type="single"
                collapsible
                className="w-full AccordionRoot"
            >
                {FAQList.map(({ question, answer, value }: FAQProps) => (
                    <AccordionItem
                        key={value}
                        value={value}
                    >
                        <AccordionTrigger className="text-left">
                            {question}
                        </AccordionTrigger>

                        <AccordionContent>{answer}</AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>

            <h3 className="font-medium mt-4">
                {t("faq.stillHaveQuestions")}{" "}
                <a
                    rel="noreferrer noopener"
                    href="#"
                    className="text-primary transition-all border-primary hover:border-b-2"
                >
                    {t("common.contactUs")}
                </a>
            </h3>
        </section>
    );
};