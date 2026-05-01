'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import AnnouncementBar from "@/app/components/layout/AnnouncementBar";
import Header from "@/app/components/layout/Header";
import Footer from "@/app/components/layout/Footer";

import HeroSection from "@/app/components/sections/HeroSection";
import TrustStrip from "@/app/components/sections/TrustStrip";
import ProblemSection from "@/app/components/sections/ProblemSection";
import ProductDemoSection from "@/app/components/sections/ProductDemoSection";
import FeaturesSection from "@/app/components/sections/FeaturesSection";
import WorkflowSection from "@/app/components/sections/WorkflowSection";
import GSTDeepDive from "@/app/components/sections/GSTDeepDive";
import WhatsAppSection from "@/app/components/sections/WhatsAppSection";
import MobileExperienceSection from "@/app/components/sections/MobileExperienceSection";
import IndustryUseCases from "@/app/components/sections/IndustryUseCases";
import AccountantSection from "@/app/components/sections/AccountantSection";
import ComplianceSection from "@/app/components/sections/ComplianceSection";
import PricingSection from "@/app/components/sections/PricingSection";
import FAQSection from "@/app/components/sections/FAQSection";
import FinalCTA from "@/app/components/sections/FinalCTA";

export default function Home() {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard')
  }, [isAuthenticated, router])

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>
        <HeroSection />
        <TrustStrip />
        <ProblemSection />
        <ProductDemoSection />
        <FeaturesSection />
        <WorkflowSection />
        <GSTDeepDive />
        <WhatsAppSection />
        <MobileExperienceSection />
        <IndustryUseCases />
        <AccountantSection />
        <ComplianceSection />
        <PricingSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
