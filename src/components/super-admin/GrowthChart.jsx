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
import { useTheme } from '../../hooks/useTheme';

export default function GrowthChart() {
    const { theme } = useTheme();
    const [period, setPeriod] = useState('6m');
    const [chartType, setChartType] = useState('area');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
 
    useEffect(() => {
        setIsMounted(true);
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

    const axisColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';
    const tooltipBg = theme === 'dark' ? '#1f2937' : 'white';
    const tooltipBorder = theme === 'dark' ? '#374151' : '#e5e7eb';
    const textColor = theme === 'dark' ? '#f3f4f6' : '#111827';

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/50 dark:border-white/10 p-4 rounded-2xl shadow-2xl ring-1 ring-black/5">
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">{label}</p>
                    <div className="space-y-1.5">
                        {payload.map((entry, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize">{entry.name}:</span>
                                <span className="text-xs font-black text-gray-900 dark:text-white">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    const renderChart = () => {
        if (chartType === 'area') {
            return (
                <AreaChart 
                    data={data}
                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorEntreprises" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorUtilisateurs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid 
                        strokeDasharray="4 4" 
                        vertical={false} 
                        stroke={gridColor} 
                        strokeOpacity={0.5} 
                    />
                    <XAxis 
                        dataKey="month" 
                        stroke={axisColor} 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fontWeight: 700 }}
                        dy={10}
                    />
                    <YAxis 
                        stroke={axisColor} 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip 
                        content={<CustomTooltip />}
                        cursor={{ stroke: axisColor, strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Legend 
                        verticalAlign="top" 
                        align="right"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ 
                            paddingBottom: '20px', 
                            fontSize: '11px', 
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }} 
                    />
                    <Area 
                        type="monotone" 
                        dataKey="entreprises" 
                        stroke="#8b5cf6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorEntreprises)" 
                        name="Entreprises"
                        animationDuration={1500}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="utilisateurs" 
                        stroke="#0ea5e9" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorUtilisateurs)" 
                        name="Utilisateurs"
                        animationDuration={1500}
                    />
                </AreaChart>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-6 shadow-lg border border-white/50 dark:border-white/5 relative overflow-hidden"
        >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Croissance</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Évolution des entreprises et utilisateurs</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-white/40 dark:bg-white/5 rounded-xl p-1 border border-white/50 dark:border-white/5">
                        {[
                            { value: '1m', label: '1M' },
                            { value: '3m', label: '3M' },
                            { value: '6m', label: '6M' },
                            { value: '12m', label: '12M' },
                        ].map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`px-3 py-1.5 text-sm font-semibold rounded-xl transition-all ${
                                    period === p.value
                                        ? 'bg-white/80 dark:bg-white/10 text-primary-600 dark:text-primary-400 shadow-sm border border-white/50 dark:border-white/10'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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
                        <div className="w-16 h-16 border-4 border-primary-200/50 dark:border-primary-800/30 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary-600 dark:border-primary-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="h-80 w-full min-h-[320px] relative">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={320} debounce={50}>
                                {renderChart()}
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-primary-50/80 dark:bg-primary-900/20 rounded-2xl p-3.5 border border-primary-200/30 dark:border-primary-800/20">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Entreprises</p>
                            <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                                {data.reduce((acc, item) => acc + item.entreprises, 0)}
                            </p>
                        </div>
                        <div className="bg-accent-50/80 dark:bg-accent-900/20 rounded-2xl p-3.5 border border-accent-200/30 dark:border-accent-800/20">
                            <p className="text-xs text-accent-600 dark:text-accent-400 font-medium">Total Utilisateurs</p>
                            <p className="text-2xl font-bold text-accent-800 dark:text-accent-300">
                                {data.reduce((acc, item) => acc + item.utilisateurs, 0)}
                            </p>
                        </div>
                        <div className="bg-emerald-50/80 dark:bg-emerald-900/20 rounded-2xl p-3.5 border border-emerald-200/30 dark:border-emerald-800/20">
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Taux de croissance</p>
                            <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                                {data.length > 1 
                                    ? `${Math.round(((data[data.length-1].entreprises - data[0].entreprises) / (data[0].entreprises || 1)) * 100)}%` 
                                    : '0%'}
                            </p>
                        </div>
                        <div className="bg-amber-50/80 dark:bg-amber-900/20 rounded-2xl p-3.5 border border-amber-200/30 dark:border-amber-800/20">
                            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Période</p>
                            <p className="text-2xl font-bold text-orange-800 dark:text-orange-300">
                                {period}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </motion.div>
    );
}

