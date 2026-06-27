import { ModelShowcase } from "@/components/pricing/ModelShowcase";
import { CostCalculator } from "@/components/pricing/CostCalculator";
import { CreditPackages } from "@/components/pricing/CreditPackages";
import { PricingFAQ } from "@/components/pricing/PricingFAQ";
import { PricingCTA } from "@/components/pricing/PricingCTA";

export const metadata = {
  title: "Pricing — Yapapa",
  description:
    "Transparent per-token pricing for 100+ AI models. No subscriptions, no hidden fees.",
};

export default function PricingPage() {
  return (
    <div className="flex flex-col items-center w-full overflow-hidden bg-[#000000] text-foreground selection:bg-primary/30 selection:text-white">
      <ModelShowcase />
      <CostCalculator />
      <CreditPackages />
      <PricingFAQ />
      <PricingCTA />
    </div>
  );
}
