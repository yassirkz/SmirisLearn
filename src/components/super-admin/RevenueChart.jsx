import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, Calendar, PieChart as PieChartIcon, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useTheme';

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
        expiringSoon: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRevenueData();
    }, []);

    const fetchRevenueData = async () => {
        setLoading(true);
        try {
            const { data: organizations, error } = await supabase
                .from('organizations')
                .select('plan_type, subscription_status, trial_ends_at, created_at');

            if (error) throw error;

            const counts = {
                trial: 0,
                active: 0,
                free: 0,
                starter: 0,
                business: 0
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

            organizations?.forEach(org => {
                const plan = org.plan_type || 'free';
                const status = org.subscription_status || 'active';
                
                if (status === 'trial') {
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
                if (createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) currentMonthCount++;
                if (createdDate.getMonth() === lastMonth && createdDate.getFullYear() === lastMonthYear) lastMonthCount++;
            });

            const chartData = [
                { name: "Essai", value: counts.trial, color: '#10B981', description: "Période d'essai gratuite" },
                { name: "Gratuit", value: counts.free, color: '#9CA3AF', description: "Plan gratuit sans engagement" },
                { name: "Starter", value: (counts.starter || 0) - counts.trial, color: '#3B82F6', description: "Plan Starter à 49€/mois" },
                { name: "Business", value: counts.business, color: '#8B5CF6', description: "Plan Business à 99€/mois" }
            ].filter(item => item.value > 0);

            const growth = lastMonthCount > 0 
                ? Math.round(((currentMonthCount - lastMonthCount) / lastMonthCount) * 100)
                : currentMonthCount > 0 ? 100 : 0;

            setData(chartData);
            setStats({
                totalCompanies: organizations?.length || 0,
                trialCompanies: counts.trial,
                activeCompanies: counts.active,
                freeCompanies: counts.free,
                starterCompanies: counts.starter,
                businessCompanies: counts.business,
                growth,
                expiringSoon: expiringSoonCount
            });

        } catch (error) {
            console.error('Erreur chargement données:', error);
        } finally {
            setLoading(false);
        }
    };

    const textColor = theme === 'dark' ? '#f3f4f6' : '#111827';
    const tooltipBg = theme === 'dark' ? '#1f2937' : 'white';
    const tooltipBorder = theme === 'dark' ? '#374151' : '#e5e7eb';

    const renderChart = () => {
        if (data.length === 0) {
            return (
                <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-400 dark:text-gray-500">Aucun résultat trouvé</p>
                </div>
            );
        }

        return (
            <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: theme === 'dark' ? '#4b5563' : '#9CA3AF', strokeWidth: 1 }}
                    >
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color}
                                stroke={theme === 'dark' ? '#1f2937' : 'white'}
                                strokeWidth={2}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value, name, props) => [`${value} Entreprises`, props.payload.name]}
                        contentStyle={{
                            backgroundColor: tooltipBg,
                            borderRadius: '12px',
                            border: `1px solid ${tooltipBorder}`,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            color: textColor
                        }}
                    />
                    <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        wrapperStyle={{ color: textColor }}
                    />
                </PieChart>
            </ResponsiveContainer>
        );
    };

    const potentialRevenue = (stats.starterCompanies - stats.trialCompanies) * 49 + stats.businessCompanies * 99;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-blue-100 dark:border-gray-700"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Répartition des Plans</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Analyse des abonnements par catégorie</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                    <PieChartIcon className="w-3 h-3" />
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                    <div className="grid grid-cols-3 gap-4">
                        {[1,2,3].map(i => (
                            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    <div className="h-64 w-full min-h-[256px] relative">
                        {renderChart()}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-3">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Total</p>
                            <p className="text-lg font-bold text-blue-800 dark:text-blue-300">{stats.totalCompanies}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Entreprises</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl p-3">
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">En essai</p>
                            <p className="text-lg font-bold text-green-800 dark:text-green-300">{stats.trialCompanies}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Période d'essai</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-3">
                            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Payants</p>
                            <p className="text-lg font-bold text-purple-800 dark:text-blue-300">{stats.activeCompanies}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Abonnements actifs</p>
                        </div>

                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Gratuits</p>
                            <p className="text-lg font-bold text-gray-800 dark:text-gray-300">{stats.freeCompanies}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Sans abonnement</p>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-100 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Revenu mensuel potentiel :</span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {new Intl.NumberFormat('fr-FR', { 
                                    style: 'currency', 
                                    currency: 'EUR',
                                    maximumFractionDigits: 0
                                }).format(potentialRevenue)}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            💡 Basé sur les tarifs publics (49€ Starter / 99€ Business)
                        </p>
                    </div>

                    <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Croissance vs mois dernier: {stats.growth > 0 ? `+${stats.growth}` : stats.growth}%</span>
                    </div>
                </>
            )}
        </motion.div>
    );
}

