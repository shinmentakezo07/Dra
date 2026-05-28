"use client";

import { useState } from "react";
import { CreditCard, Zap, Check, Ticket, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { usePurchaseCredits, useRedeemPromoCode } from "@/lib/api/hooks";

const creditPackages = [
  { amount: 10000, price: 10, label: "Starter" },
  { amount: 50000, price: 45, label: "Pro", popular: true },
  { amount: 200000, price: 160, label: "Enterprise" },
];

export default function BillingPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const purchaseCredits = usePurchaseCredits();

  const handlePurchase = async (pkg: (typeof creditPackages)[0]) => {
    setSelected(pkg.amount);

    try {
      const result = await purchaseCredits.mutateAsync({
        amount: pkg.amount,
        description: `${pkg.label} Package`,
      });
      const data = (result as any)?.data ?? result;
      if (data?.checkoutUrl) {
        const url = data.checkoutUrl as string;
        if (typeof url === "string") {
          try {
            const parsed = new URL(url);
            const allowedHosts = [
              "checkout.stripe.com",
              "buy.stripe.com",
              "stripe.com",
            ];
            if (
              parsed.protocol === "https:" &&
              allowedHosts.includes(parsed.hostname)
            ) {
              window.location.href = url;
              return;
            }
          } catch {
            // Invalid URL
          }
        }
        alert("Invalid checkout URL received.");
        return;
      }
      alert(`Purchased ${pkg.amount.toLocaleString()} credits!`);
    } catch {
      alert("Purchase failed. Please try again.");
    } finally {
      setSelected(null);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-white">Billing</h1>
      </div>

      {/* Current Plan */}
      <section className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Current Plan</h2>
        <p className="text-gray-400 text-sm">
          You are on the Pay-as-you-go plan. Purchase credits to use API
          features.
        </p>
      </section>

      {/* Promo Code */}
      <PromoCodeSection />

      {/* Credit Packages */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">
          Purchase Credits
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {creditPackages.map((pkg) => (
            <motion.div
              key={pkg.amount}
              whileHover={{ y: -4 }}
              className={`relative bg-[#0A0A0A] border rounded-xl p-6 ${
                pkg.popular ? "border-primary" : "border-white/10"
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                  Most Popular
                </span>
              )}
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-semibold">{pkg.label}</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">${pkg.price}</p>
              <p className="text-gray-400 text-sm mb-6">
                {pkg.amount.toLocaleString()} credits
              </p>
              <button
                onClick={() => handlePurchase(pkg)}
                disabled={purchaseCredits.isPending && selected === pkg.amount}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
                  pkg.popular
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-white/5 text-white hover:bg-white/10"
                } disabled:opacity-50`}
              >
                {purchaseCredits.isPending && selected === pkg.amount
                  ? "Processing..."
                  : "Purchase"}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Payment Methods */}
      <section className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Payment Methods
        </h2>
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
          <div className="w-10 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded" />
          <div>
            <p className="text-white text-sm font-medium">Stripe Checkout</p>
            <p className="text-gray-500 text-xs">
              Secure payment processing powered by Stripe
            </p>
          </div>
          <Check className="w-5 h-5 text-green-400 ml-auto" />
        </div>
      </section>
    </div>
  );
}

function PromoCodeSection() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const redeemPromo = useRedeemPromoCode();

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setStatus(null);
    try {
      const result = await redeemPromo.mutateAsync(code.trim().toUpperCase());
      const data = (result as any)?.data ?? result;
      setStatus({
        type: "success",
        msg: `Redeemed! ${data.credits?.toLocaleString() ?? ""} credits added to your account.`,
      });
      setCode("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Invalid or expired promo code.";
      setStatus({ type: "error", msg });
    }
  };

  return (
    <section className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Ticket className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-semibold text-white">Have a Promo Code?</h2>
      </div>
      <div className="flex gap-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ENTER CODE"
          className="flex-1 max-w-xs bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono tracking-widest uppercase placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
          onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
        />
        <button
          onClick={handleRedeem}
          disabled={redeemPromo.isPending || !code.trim()}
          className="px-5 py-2.5 bg-purple-500/10 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/20 ring-1 ring-purple-500/20 transition-all duration-200 disabled:opacity-30 flex items-center gap-2"
        >
          {redeemPromo.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Redeem
        </button>
      </div>
      {status && (
        <div
          className={`mt-3 text-sm flex items-center gap-2 ${
            status.type === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          {status.type === "success" ? <Check className="w-4 h-4" /> : null}
          {status.msg}
        </div>
      )}
    </section>
  );
}
