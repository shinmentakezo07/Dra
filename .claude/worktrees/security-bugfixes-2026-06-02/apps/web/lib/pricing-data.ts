import {
  Code2,
  Crown,
  Shield,
  Sparkles,
  Zap,
  Star,
  Activity,
  MessageSquare,
  FileText,
  BrainCircuit,
  ImageIcon,
} from "lucide-react";
import { getProviderLogo } from "./provider-logos";

export interface CreditPackage {
  name: string;
  amount: string;
  credits: string;
  creditsDisplay: string;
  bonus: string;
  description: string;
  features: string[];
  icon: typeof Code2;
  color: string;
  cta: string;
  popular: boolean;
  gradient: string;
}

export const creditPackages: CreditPackage[] = [
  {
    name: "Starter",
    amount: "$10",
    credits: "10,000",
    creditsDisplay: "10K Credits",
    bonus: "",
    description: "Perfect for testing and small projects.",
    features: [
      "~1M tokens (varies by model)",
      "Access to 100+ models",
      "Pay only for what you use",
      "Credits never expire",
    ],
    icon: Code2,
    color: "text-blue-400",
    cta: "Add $10 Credits",
    popular: false,
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    name: "Popular",
    amount: "$50",
    credits: "55,000",
    creditsDisplay: "55K Credits",
    bonus: "+10% Bonus",
    description: "Best value for growing applications.",
    features: [
      "~5.5M tokens (varies by model)",
      "Access to 100+ models",
      "10% bonus credits included",
      "Priority email support",
      "Real-time analytics",
      "Credits never expire",
    ],
    icon: Crown,
    color: "text-yellow-400",
    cta: "Add $50 Credits",
    popular: true,
    gradient: "from-yellow-500/20 to-orange-500/20",
  },
  {
    name: "Pro",
    amount: "$100",
    credits: "120,000",
    creditsDisplay: "120K Credits",
    bonus: "+20% Bonus",
    description: "For production applications at scale.",
    features: [
      "~12M tokens (varies by model)",
      "Access to 100+ models",
      "20% bonus credits included",
      "Priority support",
      "Advanced analytics",
      "Custom rate limits",
      "Credits never expire",
    ],
    icon: Shield,
    color: "text-purple-400",
    cta: "Add $100 Credits",
    popular: false,
    gradient: "from-purple-500/20 to-pink-500/20",
  },
];

export interface FeaturedModel {
  id: string;
  name: string;
  provider: string;
  inputPrice: string;
  outputPrice: string;
  context: string;
  icon: typeof Sparkles;
  color: string;
  logo?: string | null;
}

export const featuredModels: FeaturedModel[] = [
  {
    id: "openai/gpt-5.4",
    name: "GPT-5.4",
    provider: "OpenAI",
    inputPrice: "$0.015",
    outputPrice: "$0.045",
    context: "256K",
    icon: Sparkles,
    color: "text-green-400",
    logo: getProviderLogo("openai/gpt-5.4"),
  },
  {
    id: "anthropic/claude-opus-4.6-fast",
    name: "Claude Opus 4.6 Fast",
    provider: "Anthropic",
    inputPrice: "$0.008",
    outputPrice: "$0.024",
    context: "200K",
    icon: Zap,
    color: "text-orange-400",
    logo: getProviderLogo("anthropic/claude-opus-4.6-fast"),
  },
  {
    id: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    provider: "Google",
    inputPrice: "$0.0002",
    outputPrice: "$0.0008",
    context: "2M",
    icon: Star,
    color: "text-blue-400",
    logo: getProviderLogo("google/gemini-3-flash-preview"),
  },
  {
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    provider: "Moonshot AI",
    inputPrice: "$0.0003",
    outputPrice: "$0.0009",
    context: "256K",
    icon: Activity,
    color: "text-purple-400",
    logo: getProviderLogo("moonshotai/kimi-k2.5"),
  },
];

export interface CalculatorModel {
  id: string;
  name: string;
  provider: string;
  inputPricePer1k: number;
  outputPricePer1k: number;
  logo?: string | null;
  icon: typeof Sparkles;
  color: string;
}

export const calculatorModels: CalculatorModel[] = [
  {
    id: "openai/gpt-5.4",
    name: "GPT-5.4",
    provider: "OpenAI",
    inputPricePer1k: 0.015,
    outputPricePer1k: 0.045,
    logo: getProviderLogo("openai/gpt-5.4"),
    icon: Sparkles,
    color: "text-green-400",
  },
  {
    id: "anthropic/claude-opus-4.6-fast",
    name: "Claude Opus 4.6",
    provider: "Anthropic",
    inputPricePer1k: 0.008,
    outputPricePer1k: 0.024,
    logo: getProviderLogo("anthropic/claude-opus-4.6-fast"),
    icon: Zap,
    color: "text-orange-400",
  },
  {
    id: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    provider: "Google",
    inputPricePer1k: 0.0002,
    outputPricePer1k: 0.0008,
    logo: getProviderLogo("google/gemini-3-flash-preview"),
    icon: Star,
    color: "text-blue-400",
  },
  {
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    provider: "Moonshot AI",
    inputPricePer1k: 0.0003,
    outputPricePer1k: 0.0009,
    logo: getProviderLogo("moonshotai/kimi-k2.5"),
    icon: Activity,
    color: "text-purple-400",
  },
];

export interface CalculatorPreset {
  label: string;
  icon: typeof MessageSquare;
  inputTokens: number;
  outputTokens: number;
}

export const calculatorPresets: CalculatorPreset[] = [
  { label: "Chat", icon: MessageSquare, inputTokens: 4000, outputTokens: 1000 },
  { label: "Code", icon: BrainCircuit, inputTokens: 15000, outputTokens: 5000 },
  { label: "Document", icon: FileText, inputTokens: 50000, outputTokens: 3000 },
  { label: "Vision", icon: ImageIcon, inputTokens: 8000, outputTokens: 2000 },
];

export interface FAQItem {
  question: string;
  answer: string;
}

export const pricingFAQ: FAQItem[] = [
  {
    question: "How do credits work?",
    answer:
      "Credits are our universal currency. 1 credit = $0.001 USD. When you make an API call, we deduct credits based on the model's per-token pricing. Credits are deducted in real-time as you use the API.",
  },
  {
    question: "Do credits expire?",
    answer:
      "No. Credits never expire. Once you purchase credits, they remain in your account indefinitely. You can use them whenever you want, with no time pressure.",
  },
  {
    question: "Can I switch between models?",
    answer:
      "Absolutely. You can switch between any of our 100+ models instantly with zero configuration changes. Just change the model ID in your API call. Your credits work with every model.",
  },
  {
    question: "What happens when I run out of credits?",
    answer:
      "Your API requests will return a 402 Payment Required status. You can add more credits anytime from your dashboard. We also send email notifications when your balance drops below $5.",
  },
  {
    question: "Is there a free tier?",
    answer:
      "We offer $5 in free credits when you sign up. This is enough to test multiple models and evaluate the platform. No credit card required to get started.",
  },
  {
    question: "How is pricing calculated?",
    answer:
      "Pricing is calculated per 1,000 tokens. Each model has an input price and an output price. Input tokens include your prompt and any context. Output tokens are what the model generates. We show exact costs per request in real-time.",
  },
];
