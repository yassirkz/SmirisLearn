import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function GrowthChart() {
    const [period, setPeriod] = useState('6m');
    const [chartType, setChartType] = useState('area');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGrowthData();
    }, [period]);

    const fetchGrowthData = async () => {
        setLoading(true);
        try {
            const months = period === '1m' ? 1 : period === '3m' ? 3 : period === '6m' ? 6 : 12;
            
            const today = new Date();
            const chartData = [];

            for (let i = months - 1; i >= 0; i--) {
                const monthDate = subMonths(today, i);
                const monthStart = startOfMonth(monthDate).toISOString();
                const monthEnd = endOfMonth(monthDate).toISOString();

                const { count: companiesCount } = await supabase
                    .from('organizations')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', monthStart)
                    .lt('created_at', monthEnd);

                const { count: usersCount } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', monthStart)
                    .lt('created_at', monthEnd);

                chartData.push({
                    month: format(monthDate, 'MMM yyyy', { locale: fr }),
                    entreprises: companiesCount || 0,
                    utilisateurs: usersCount || 0,
                });
            }

            setData(chartData);
        } catch (error) {
            console.error('Erreur chargement données:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderChart = () => {
        if (chartType === 'area') {
            return (
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorEntreprises" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorUtilisateurs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: 'white', 
                            borderRadius: '12px', 
                            border: '1px solid #E5E7EB',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }} 
                    />
                    <Legend />
                    <Area 
                        type="monotone" 
                        dataKey="entreprises" 
                        stroke="#3B82F6" 
                        fillOpacity={1} 
                        fill="url(#colorEntreprises)" 
                        name="Entreprises"
                    />
                    <Area 
                        type="monotone" 
                        dataKey="utilisateurs" 
                        stroke="#8B5CF6" 
                        fillOpacity={1} 
                        fill="url(#colorUtilisateurs)" 
                        name="Utilisateurs"
                    />
                </AreaChart>
            );
        }
        // ... autres types de graphiques
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100"
        >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Croissance</h2>
                    <p className="text-sm text-gray-500">Évolution des entreprises et utilisateurs</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {[
                            { value: '1m', label: '1M' },
                            { value: '3m', label: '3M' },
                            { value: '6m', label: '6M' },
                            { value: '12m', label: '12M' },
                        ].map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                    period === p.value
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="h-80 flex items-center justify-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Conteneur avec hauteur fixe */}
                    <div className="h-80 w-full relative" style={{ minHeight: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {renderChart()}
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3">
                            <p className="text-xs text-blue-600 font-medium">Total entreprises</p>
                            <p className="text-2xl font-bold text-blue-800">
                                {data.reduce((acc, item) => acc + item.entreprises, 0)}
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3">
                            <p className="text-xs text-purple-600 font-medium">Total utilisateurs</p>
                            <p className="text-2xl font-bold text-purple-800">
                                {data.reduce((acc, item) => acc + item.utilisateurs, 0)}
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3">
                            <p className="text-xs text-green-600 font-medium">Croissance</p>
                            <p className="text-2xl font-bold text-green-800">
                                {data.length > 1 
                                    ? `${Math.round(((data[data.length-1].entreprises - data[0].entreprises) / data[0].entreprises) * 100)}%` 
                                    : '0%'}
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3">
                            <p className="text-xs text-orange-600 font-medium">Période</p>
                            <p className="text-2xl font-bold text-orange-800">
                                {period}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </motion.div>
    );
}