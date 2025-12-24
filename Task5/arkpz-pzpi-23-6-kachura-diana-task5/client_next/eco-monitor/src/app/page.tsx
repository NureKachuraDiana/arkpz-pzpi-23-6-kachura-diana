"use client"

import "./landing.css";
import {Hero} from "@/components/landing/Hero";
import {Cta} from "@/components/landing/Cta"
import {Features} from "@/components/landing/Features"
import {About} from "@/components/landing/About";
import {HowItWorks} from "@/components/landing/HowItWorks";
import {Services} from "@/components/landing/Services";
import {Newsletter} from "@/components/landing/Newsletter";
import {FAQ} from "@/components/landing/FAQ";
import {Footer} from "@/components/landing/Footer";
import {ScrollToTop} from "@/components/landing/ScrollToTop";

export default function Home() {
    return (
        <div className="landing-page-wrapper">
            <Hero />
            <About />
            <HowItWorks />
            <Features />
            <Services />
            <Cta />
            <Newsletter />
            <FAQ />
            <Footer />
            <ScrollToTop />
        </div>
    );
}