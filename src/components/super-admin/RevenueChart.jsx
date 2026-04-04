import React, { useState, useEffect, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Calendar,
  PieChart as PieChartIcon,
  Clock,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../hooks/useTheme";
import LoadingSpinner from "../ui/LoadingSpinner";

// Lazy load the chart component
const RevenueChartImpl = lazy(() => import("./RevenueChartImpl"));

export default function RevenueChart() {
  const { theme } = useTheme();
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    trialCompanies: 0,
    activeCompanies: 0,
    freeCompanies: 0,
    starterCompanies: 0,
    businessCompanies: 0,
    growth: 0,
    expiringSoon: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const { data: organizations, error } = await supabase
        .from("organizations")
        .select("plan_type, subscription_status, trial_ends_at, created_at");

      if (error) throw error;

      const counts = {
        trial: 0,
        active: 0,
        free: 0,
        starter: 0,
        business: 0,
      };

      let currentMonthCount = 0;
      let lastMonthCount = 0;
      let expiringSoonCount = 0;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      organizations?.forEach((org) => {
        const plan = org.plan_type || "free";
        const status = org.subscription_status || "active";

        if (status === "trial") {
          counts.trial++;
          if (org.trial_ends_at) {
            const trialEnd = new Date(org.trial_ends_at);
            if (trialEnd <= threeDaysFromNow) expiringSoonCount++;
          }
        } else {
          counts.active++;
        }

        counts[plan] = (counts[plan] || 0) + 1;

        const createdDate = new Date(org.created_at);
        if (
          createdDate.getMonth() === currentMonth &&
          createdDate.getFullYear() === currentYear
        )
          currentMonthCount++;
        if (
          createdDate.getMonth() === lastMonth &&
          createdDate.getFullYear() === lastMonthYear
        )
          lastMonthCount++;
      });

      const chartData = [
        {
          name: "Essai",
          value: counts.trial,
          color: "#10B981",
          description: "Période d'essai gratuite",
        },
        {
          name: "Gratuit",
          value: counts.free,
          color: "#9CA3AF",
          description: "Plan gratuit sans engagement",
        },
        {
          name: "Starter",
          value: (counts.starter || 0) - counts.trial,
          color: "#8b5cf6",
          description: "Plan Starter à 49€/mois",
        },
        {
          name: "Business",
          value: counts.business,
          color: "#0ea5e9",
          description: "Plan Business à 99€/mois",
        },
      ].filter((item) => item.value > 0);

      const growth =
        lastMonthCount > 0
          ? Math.round(
              ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100,
            )
          : currentMonthCount > 0
            ? 100
            : 0;

      setData(chartData);
      setStats({
        totalCompanies: organizations?.length || 0,
        trialCompanies: counts.trial,
        activeCompanies: counts.active,
        freeCompanies: counts.free,
        starterCompanies: counts.starter,
        businessCompanies: counts.business,
        growth,
        expiringSoon: expiringSoonCount,
      });
    } catch (error) {
      console.error("Erreur chargement données:", error);
    } finally {
      setLoading(false);
    }
  };

  const textColor = theme === "dark" ? "#f3f4f6" : "#111827";
  const tooltipBg = theme === "dark" ? "#1f2937" : "white";
  const tooltipBorder = theme === "dark" ? "#374151" : "#e5e7eb";

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/50 dark:border-white/10 p-4 rounded-2xl shadow-2xl ring-1 ring-black/5">
          <p className="text-sm font-black text-gray-900 dark:text-white mb-1">
            {data.name}
          </p>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
            {data.description}
          </p>
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Entreprises:
            </span>
            <span className="text-sm font-black text-gray-900 dark:text-white">
              {data.value}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    return (
      <Suspense fallback={<LoadingSpinner size="sm" />}>
        <RevenueChartImpl
          data={data}
          theme={theme}
          CustomTooltip={CustomTooltip}
        />
      </Suspense>
    );
  };

  const potentialRevenue =
    (stats.starterCompanies - stats.trialCompanies) * 49 +
    stats.businessCompanies * 99;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50 dark:border-white/5 relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Répartition des Plans
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Analyse des abonnements par catégorie
          </p>
        </div>
        <div className="bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
          <PieChartIcon className="w-3 h-3" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="h-64 w-full min-h-[256px] relative">
            {isMounted && renderChart()}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl p-3">
              <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mb-1">
                Total
              </p>
              <p className="text-lg font-bold text-primary-800 dark:text-primary-300">
                {stats.totalCompanies}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Entreprises
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl p-3">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                En essai
              </p>
              <p className="text-lg font-bold text-green-800 dark:text-green-300">
                {stats.trialCompanies}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Période d'essai
              </p>
            </div>

            <div className="bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/30 dark:to-accent-800/30 rounded-xl p-3">
              <p className="text-xs text-accent-600 dark:text-accent-400 font-medium mb-1">
                Payants
              </p>
              <p className="text-lg font-bold text-accent-800 dark:text-accent-300">
                {stats.activeCompanies}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Abonnements actifs
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
                Gratuits
              </p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-300">
                {stats.freeCompanies}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sans abonnement
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl border border-primary-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Revenu mensuel potentiel :
              </span>
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                  maximumFractionDigits: 0,
                }).format(potentialRevenue)}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 Basé sur les tarifs publics (49€ Starter / 99€ Business)
            </p>
          </div>

          <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>
              Croissance vs mois dernier:{" "}
              {stats.growth > 0 ? `+${stats.growth}` : stats.growth}%
            </span>
          </div>
        </>
      )}
    </motion.div>
  );
}
