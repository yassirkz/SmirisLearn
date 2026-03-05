//eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import MainLayout from '../../components/layout/MainLayout'
import StatsCards from '../../components/super-admin/StatsCards'
import CompaniesTable from '../../components/super-admin/CompaniesTable'

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

            {/* Tableau des entreprises */}
            <CompaniesTable />
        </motion.div>
        </MainLayout>
    )
}