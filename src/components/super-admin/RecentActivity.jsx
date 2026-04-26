import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, UserPlus, Video, Award, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function RecentActivity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const fetchRecentActivities = async () => {
    try {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      const { data: users } = await supabase
        .from('profiles')
        .select('full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      const { data: videos } = await supabase
        .from('videos')
        .select('title, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      const allActivities = [
        ...(orgs?.map(o => ({
          type: 'org',
          icon: Building2,
          color: 'text-primary-600 dark:text-primary-400',
          bg: 'bg-primary-100 dark:bg-primary-900/30',
          title: `Nouvelle entreprise: ${o.name}`,
          time: o.created_at
        })) || []),
        ...(users?.map(u => ({
          type: 'user',
          icon: UserPlus,
          color: 'text-accent-600 dark:text-accent-400',
          bg: 'bg-accent-100 dark:bg-accent-900/30',
          title: `Nouvel utilisateur: ${u.full_name}`,
          time: u.created_at
        })) || []),
        ...(videos?.map(v => ({
          type: 'video',
          icon: Video,
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-100 dark:bg-green-900/30',
          title: `Nouvelle vidéo: ${v.title}`,
          time: v.created_at
        })) || [])
      ]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 5);

      setActivities(allActivities);
    } catch (error) {
      console.error('Erreur chargement activités:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl p-8 rounded-3xl border border-white/50 dark:border-white/5 shadow-lg h-full overflow-hidden relative"
    >
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-primary-500 to-accent-600 rounded-full opacity-0 dark:opacity-10 blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Activité Récente</h2>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">DERNIÈRES MISES À JOUR</p>
        </div>
        <div className="p-2.5 bg-gradient-to-br from-primary-500 to-accent-600 rounded-xl shadow-lg shadow-primary-500/30">
          <Clock className="w-5 h-5 text-white" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 bg-white/40 dark:bg-white/5 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-4 bg-white/40 dark:bg-white/5 rounded-lg w-3/4 mb-2"></div>
                <div className="h-3 bg-white/40 dark:bg-white/5 rounded-lg w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8">
          <Award className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Aucune activité récente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = activity.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/50 dark:hover:bg-white/5 transition-all group relative border border-transparent hover:border-white/50 dark:hover:border-white/5"
              >
                <div className={`w-12 h-12 ${activity.bg} rounded-xl flex items-center justify-center shadow-sm border border-white/50 dark:border-white/5 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${activity.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{activity.title}</p>
                  <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(activity.time), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

