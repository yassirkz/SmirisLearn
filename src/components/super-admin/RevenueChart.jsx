import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, Calendar, PieChart as PieChartIcon, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function RevenueChart() {
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
            // Récupérer toutes les entreprises avec leurs statuts
            const { data: organizations, error } = await supabase
                .from('organizations')
                .select('plan_type, subscription_status, trial_ends_at, created_at');

            if (error) throw error;

            // Compter par plan et statut
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

            // Date dans 3 jours pour les essais bientôt expirés
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

            organizations?.forEach(org => {
                const plan = org.plan_type || 'free';
                const status = org.subscription_status || 'active';
                
                // Compter par statut
                if (status === 'trial') {
                    counts.trial++;
                    
                    // Vérifier si l'essai expire bientôt (moins de 3 jours)
                    if (org.trial_ends_at) {
                        const trialEnd = new Date(org.trial_ends_at);
                        if (trialEnd <= threeDaysFromNow) {
                            expiringSoonCount++;
                        }
                    }
                } else {
                    counts.active++;
                }
                
                // Compter par plan (indépendamment du statut)
                counts[plan] = (counts[plan] || 0) + 1;

                // Compter pour la croissance
                const createdDate = new Date(org.created_at);
                if (createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) {
                    currentMonthCount++;
                }
                if (createdDate.getMonth() === lastMonth && createdDate.getFullYear() === lastMonthYear) {
                    lastMonthCount++;
                }
            });

            // Données pour le graphique (regrouper les entreprises payantes vs essai)
            const chartData = [
                {
                    name: 'En période d\'essai',
                    value: counts.trial || 0,
                    color: '#10B981', // Vert émeraude
                    description: 'Starter - 14 jours d\'essai'
                },
                {
                    name: 'Gratuit',
                    value: counts.free || 0,
                    color: '#9CA3AF', // Gris
                    description: 'Plan Free'
                },
                {
                    name: 'Starter (payant)',
                    value: (counts.starter || 0) - counts.trial,
                    color: '#3B82F6', // Bleu
                    description: '49€/mois'
                },
                {
                    name: 'Business',
                    value: counts.business || 0,
                    color: '#8B5CF6', // Violet
                    description: '99€/mois'
                }
            ].filter(item => item.value > 0);

            // Calcul de la croissance
            const growth = lastMonthCount > 0 
                ? Math.round(((currentMonthCount - lastMonthCount) / lastMonthCount) * 100)
                : currentMonthCount > 0 ? 100 : 0;

            setData(chartData);
            setStats({
                totalCompanies: organizations?.length || 0,
                trialCompanies: counts.trial || 0,
                activeCompanies: counts.active || 0,
                freeCompanies: counts.free || 0,
                starterCompanies: counts.starter || 0,
                businessCompanies: counts.business || 0,
                growth,
                expiringSoon: expiringSoonCount
            });

        } catch (error) {
            console.error('Erreur chargement données:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderChart = () => {
        if (data.length === 0) {
            return (
                <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-400">Aucune donnée disponible</p>
                </div>
            );
        }

        return (
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                    >
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color}
                                stroke="white"
                                strokeWidth={2}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value, name, props) => {
                            if (name === 'value') {
                                return [`${value} entreprises`, props.payload.name];
                            }
                            return [value, name];
                        }}
                        contentStyle={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            border: '1px solid #E5E7EB',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                </PieChart>
            </ResponsiveContainer>
        );
    };

    // Calcul des revenus potentiels (pour l'information)
    const potentialRevenue = (stats.starterCompanies - stats.trialCompanies) * 49 + stats.businessCompanies * 99;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Analyse des abonnements</h2>
                    <p className="text-sm text-gray-500">Répartition des entreprises par statut</p>
                </div>
                <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                    <PieChartIcon className="w-3 h-3" />
                    <span>Intégration Stripe (Semaine 5)</span>
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    <div className="h-48 bg-gray-100 rounded-xl animate-pulse"></div>
                    <div className="grid grid-cols-3 gap-4">
                        {[1,2,3].map(i => (
                            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {/* Graphique */}
                    <div className="h-64 w-full relative" style={{ minHeight: '256px' }}>
                        {renderChart()}
                    </div>

                    {/* Cartes de statistiques */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3">
                            <p className="text-xs text-blue-600 font-medium mb-1">Total</p>
                            <p className="text-lg font-bold text-blue-800">{stats.totalCompanies}</p>
                            <p className="text-xs text-gray-500">entreprises</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3">
                            <p className="text-xs text-green-600 font-medium mb-1">En essai</p>
                            <p className="text-lg font-bold text-green-800">{stats.trialCompanies}</p>
                            <p className="text-xs text-gray-500">Starter (14j)</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3">
                            <p className="text-xs text-purple-600 font-medium mb-1">Payants</p>
                            <p className="text-lg font-bold text-purple-800">{stats.activeCompanies}</p>
                            <p className="text-xs text-gray-500">Starter/Business</p>
                        </div>

                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3">
                            <p className="text-xs text-gray-600 font-medium mb-1">Gratuit</p>
                            <p className="text-lg font-bold text-gray-800">{stats.freeCompanies}</p>
                            <p className="text-xs text-gray-500">Plan Free</p>
                        </div>
                    </div>

                    {/* Détail par plan */}
                    <div className="mt-4 space-y-2">
                        {/* Essais */}
                        {stats.trialCompanies > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100"
                            >
                                <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-green-600" />
                                    <div>
                                        <p className="font-medium text-gray-800">Période d'essai</p>
                                        <p className="text-xs text-green-600">
                                            {stats.expiringSoon > 0 
                                                ? `⚠️ ${stats.expiringSoon} expire${stats.expiringSoon > 1 ? 'nt' : ''} bientôt`
                                                : '14 jours gratuits'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-800">{stats.trialCompanies}</p>
                                    <p className="text-xs text-gray-500">entreprises</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Plans payants */}
                        {stats.starterCompanies - stats.trialCompanies > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="flex items-center justify-between p-3 bg-blue-50 rounded-xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <div>
                                        <p className="font-medium text-gray-800">Starter</p>
                                        <p className="text-xs text-gray-500">49€/mois</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-800">{stats.starterCompanies - stats.trialCompanies}</p>
                                    <p className="text-xs text-gray-500">entreprises</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Business */}
                        {stats.businessCompanies > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center justify-between p-3 bg-purple-50 rounded-xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                                    <div>
                                        <p className="font-medium text-gray-800">Business</p>
                                        <p className="text-xs text-gray-500">99€/mois</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-800">{stats.businessCompanies}</p>
                                    <p className="text-xs text-gray-500">entreprises</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Free */}
                        {stats.freeCompanies > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                                    <div>
                                        <p className="font-medium text-gray-800">Gratuit</p>
                                        <p className="text-xs text-gray-500">Plan Free</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-800">{stats.freeCompanies}</p>
                                    <p className="text-xs text-gray-500">entreprises</p>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Revenus potentiels */}
                    <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Revenus mensuels potentiels</span>
                            <span className="text-lg font-bold text-blue-600">
                                {new Intl.NumberFormat('fr-FR', { 
                                    style: 'currency', 
                                    currency: 'EUR',
                                    maximumFractionDigits: 0
                                }).format(potentialRevenue)}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            💡 Après conversion des essais et intégration Stripe
                        </p>
                    </div>

                    {/* Alertes pour les essais */}
                    {stats.expiringSoon > 0 && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <p className="text-xs text-yellow-700 flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                <span>
                                    ⚠️ {stats.expiringSoon} entreprise{stats.expiringSoon > 1 ? 's' : ''} en période d'essai expire{stats.expiringSoon > 1 ? 'nt' : ''} dans moins de 3 jours.
                                </span>
                            </p>
                        </div>
                    )}

                    {/* Note d'information */}
                    <div className="mt-4 text-xs text-gray-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Croissance: {stats.growth > 0 ? '+' : ''}{stats.growth}% vs mois dernier</span>
                    </div>
                </>
            )}
        </motion.div>
    );
}