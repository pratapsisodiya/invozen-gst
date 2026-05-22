import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
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
import ServicesRoadmapSection from "@/app/components/sections/ServicesRoadmapSection";
import ComplianceSection from "@/app/components/sections/ComplianceSection";
import PricingSection from "@/app/components/sections/PricingSection";
import FAQSection from "@/app/components/sections/FAQSection";
import FinalCTA from "@/app/components/sections/FinalCTA";

export default async function Home() {
  const { userId } = await auth()

  if (userId) {
    redirect('/dashboard')
  }

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
        <ServicesRoadmapSection />
        <ComplianceSection />
        <PricingSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
