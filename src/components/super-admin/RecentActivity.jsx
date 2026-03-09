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
      // Récupérer les dernières entreprises
      const { data: orgs } = await supabase
        .from('organizations')
        .select('name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      // Récupérer les derniers utilisateurs
      const { data: users } = await supabase
        .from('profiles')
        .select('full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      // Récupérer les dernières vidéos
      const { data: videos } = await supabase
        .from('videos')
        .select('title, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      const allActivities = [
        ...(orgs?.map(o => ({
          type: 'org',
          icon: Building2,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          title: `Nouvelle entreprise : ${o.name}`,
          time: o.created_at
        })) || []),
        ...(users?.map(u => ({
          type: 'user',
          icon: UserPlus,
          color: 'text-purple-600',
          bg: 'bg-purple-100',
          title: `Nouvel utilisateur : ${u.full_name}`,
          time: u.created_at
        })) || []),
        ...(videos?.map(v => ({
          type: 'video',
          icon: Video,
          color: 'text-green-600',
          bg: 'bg-green-100',
          title: `Nouvelle vidéo : ${v.title}`,
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
      className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100 h-full"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Activité récente</h2>
          <p className="text-sm text-gray-500">Les 5 dernières actions</p>
        </div>
        <Clock className="w-5 h-5 text-gray-400" />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune activité récente</p>
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
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
              >
                <div className={`w-10 h-10 ${activity.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-5 h-5 ${activity.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{activity.title}</p>
                  <p className="text-xs text-gray-500">
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