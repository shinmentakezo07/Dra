"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Shield, Trash2, Plus, Loader2 } from "lucide-react";
import {
  useBudget,
  useSetBudget,
  useBudgetAlerts,
  useCreateBudgetAlert,
  useDeleteBudgetAlert,
  useBudgetCap,
  useCreateBudgetCap,
  useUpdateBudgetCap,
  useDeleteBudgetCap,
} from "@/lib/api/hooks";

export function BudgetSettings() {
  const { data: budget, isLoading: budgetLoading } = useBudget();
  const { data: alerts, isLoading: alertsLoading } = useBudgetAlerts();
  const { data: cap, isLoading: capLoading } = useBudgetCap();

  const setBudget = useSetBudget();
  const createAlert = useCreateBudgetAlert();
  const deleteAlert = useDeleteBudgetAlert();
  const createCap = useCreateBudgetCap();
  const updateCap = useUpdateBudgetCap();
  const deleteCap = useDeleteBudgetCap();

  const [dailyBudget, setDailyBudget] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("80");
  const [capLimit, setCapLimit] = useState("");
  const [capAction, setCapAction] = useState("block");

  const handleSaveBudget = () => {
    setBudget.mutate({
      dailyLimit: dailyBudget ? parseInt(dailyBudget) : undefined,
      monthlyLimit: monthlyBudget ? parseInt(monthlyBudget) : undefined,
    });
  };

  const handleAddAlert = () => {
    const threshold = parseInt(alertThreshold);
    if (threshold >= 1 && threshold <= 100) {
      createAlert.mutate({ thresholdPercent: threshold, alertType: "email" });
    }
  };

  const handleSaveCap = () => {
    const limit = parseInt(capLimit);
    if (limit > 0) {
      if (cap) {
        updateCap.mutate({ hardLimit: limit, actionOnExceed: capAction });
      } else {
        createCap.mutate({ hardLimit: limit, actionOnExceed: capAction });
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Spending Budget */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0A0A0A]/50 border border-white/5 rounded-2xl p-6"
      >
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#3b82f6]" />
          Spending Budget
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">
              Daily Limit (credits)
            </label>
            <input
              type="number"
              placeholder={budget?.dailyLimit?.toString() || "No limit"}
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">
              Monthly Limit (credits)
            </label>
            <input
              type="number"
              placeholder={budget?.monthlyLimit?.toString() || "No limit"}
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSaveBudget}
            disabled={setBudget.isPending}
            className="px-4 py-2 bg-[#3b82f6] text-black font-medium rounded-lg hover:bg-[#3b82f6]/90 transition-colors disabled:opacity-50"
          >
            {setBudget.isPending ? "Saving..." : "Save Budget"}
          </button>
        </div>
      </motion.section>

      {/* Budget Alerts */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#0A0A0A]/50 border border-white/5 rounded-2xl p-6"
      >
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-400" />
          Budget Alerts
        </h2>

        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <input
              type="number"
              min={1}
              max={100}
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">
              Alert when spending reaches this % of budget
            </p>
          </div>
          <button
            onClick={handleAddAlert}
            disabled={createAlert.isPending}
            className="px-4 py-2 bg-[#3b82f6] text-black font-medium rounded-lg hover:bg-[#3b82f6]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {alertsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : alerts && alerts.length > 0 ? (
              alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between bg-black/30 border border-white/5 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${alert.isActive ? "bg-green-400" : "bg-gray-500"}`}
                    />
                    <span className="text-white text-sm">
                      Notify at{" "}
                      <span className="font-semibold">
                        {alert.thresholdPercent}%
                      </span>{" "}
                      via {alert.alertType}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteAlert.mutate(alert.id)}
                    disabled={deleteAlert.isPending}
                    className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">
                No alerts configured yet.
              </p>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Hard Cap */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#0A0A0A]/50 border border-white/5 rounded-2xl p-6"
      >
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-400" />
          Hard Spending Cap
        </h2>

        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">
              Hard Limit (credits)
            </label>
            <input
              type="number"
              placeholder={cap?.hardLimit?.toString() || "No cap"}
              value={capLimit}
              onChange={(e) => setCapLimit(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">
              Action on Exceed
            </label>
            <select
              value={capAction}
              onChange={(e) => setCapAction(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
            >
              <option value="block">Block Requests</option>
              <option value="warn">Warn Only</option>
              <option value="notify">Notify Admin</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          {cap && (
            <button
              onClick={() => deleteCap.mutate()}
              disabled={deleteCap.isPending}
              className="px-4 py-2 text-red-400 font-medium rounded-lg hover:bg-red-400/10 transition-colors disabled:opacity-50"
            >
              Remove Cap
            </button>
          )}
          <button
            onClick={handleSaveCap}
            disabled={createCap.isPending || updateCap.isPending}
            className="px-4 py-2 bg-[#3b82f6] text-black font-medium rounded-lg hover:bg-[#3b82f6]/90 transition-colors disabled:opacity-50"
          >
            {createCap.isPending || updateCap.isPending
              ? "Saving..."
              : cap
                ? "Update Cap"
                : "Set Cap"}
          </button>
        </div>
      </motion.section>
    </div>
  );
}
