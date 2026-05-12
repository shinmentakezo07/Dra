"use client";

import { useState } from "react";
import { CreditCard, Zap, Check } from "lucide-react";
import { motion } from "framer-motion";

const creditPackages = [
  { amount: 10000, price: 10, label: "Starter" },
  { amount: 50000, price: 45, label: "Pro", popular: true },
  { amount: 200000, price: 160, label: "Enterprise" },
];

export default function BillingPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePurchase = async (pkg: typeof creditPackages[0]) => {
    setSelected(pkg.amount);
    setLoading(true);

    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: pkg.amount, description: `${pkg.label} Package` }),
      });
      const json = await res.json();
      if (res.ok && json.data?.checkoutUrl) {
        const url = json.data.checkoutUrl as string;
        if (
          typeof url === "string" &&
          (url.startsWith("https://checkout.stripe.com/") ||
            url.startsWith("https://buy.stripe.com/") ||
            url.startsWith("https://stripe.com/"))
        ) {
          window.location.href = url;
          return;
        }
        alert("Invalid checkout URL received.");
        return;
      }
      if (res.ok) {
        alert(`Purchased ${pkg.amount.toLocaleString()} credits!`);
      } else {
        alert(json.error || "Purchase failed. Please try again.");
      }
    } catch {
      alert("Purchase failed. Please try again.");
    } finally {
      setLoading(false);
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
        <p className="text-gray-400 text-sm">You are on the Pay-as-you-go plan. Purchase credits to use API features.</p>
      </section>

      {/* Credit Packages */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Purchase Credits</h2>
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
              <p className="text-gray-400 text-sm mb-6">{pkg.amount.toLocaleString()} credits</p>
              <button
                onClick={() => handlePurchase(pkg)}
                disabled={loading && selected === pkg.amount}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
                  pkg.popular
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-white/5 text-white hover:bg-white/10"
                } disabled:opacity-50`}
              >
                {loading && selected === pkg.amount ? "Processing..." : "Purchase"}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Payment Methods */}
      <section className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Payment Methods</h2>
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
          <div className="w-10 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded" />
          <div>
            <p className="text-white text-sm font-medium">Stripe Checkout</p>
            <p className="text-gray-500 text-xs">Secure payment processing powered by Stripe</p>
          </div>
          <Check className="w-5 h-5 text-green-400 ml-auto" />
        </div>
      </section>
    </div>
  );
}
