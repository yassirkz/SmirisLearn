import { motion } from 'framer-motion';
import MainLayout from '../../components/layout/MainLayout';
import StatsCards from '../../components/super-admin/StatsCards';
import CompaniesTable from '../../components/super-admin/CompaniesTable';
import GrowthChart from '../../components/super-admin/GrowthChart';
import RevenueChart from '../../components/super-admin/RevenueChart';
import RecentActivity from '../../components/super-admin/RecentActivity';

export default function SuperAdminDashboard() {
  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-8"
      >
        {/* En-tête */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Super Admin</h1>
          <p className="text-gray-500 mt-1">Bienvenue sur votre espace d'administration</p>
        </div>

        {/* Statistiques */}
        <StatsCards />

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GrowthChart />
          <RevenueChart />
        </div>

        {/* Activité récente et tableau */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CompaniesTable />
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>
      </motion.div>
    </MainLayout>
  );
}