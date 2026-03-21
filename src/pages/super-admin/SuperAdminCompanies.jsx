import { motion } from 'framer-motion';
import { Building2, Sparkles } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import CompaniesTable from '../../components/super-admin/CompaniesTable';

export default function SuperAdminCompanies() {
    return (
        <MainLayout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
            >
                {/* En-tête */}
                <div className="relative">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-4 -right-4"
                    >
                        <div className="bg-gradient-to-r from-primary-600 to-accent-600 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Gestion des entreprises
                        </div>
                    </motion.div>

                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                            Entreprises
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Gérez toutes les entreprises clientes de la plateforme
                        </p>
                    </div>
                </div>

                {/* Tableau des entreprises */}
                <CompaniesTable />

                {/* Note de bas de page */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1"
                >
                    <Sparkles className="w-3 h-3 text-purple-400 dark:text-purple-500" />
                    <span>Propulsé par Smiris Learn Admin Engine</span>
                </motion.div>
            </motion.div>
        </MainLayout>
    );
}