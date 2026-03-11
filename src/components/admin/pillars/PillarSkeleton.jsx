// src/components/admin/pillars/PillarSkeleton.jsx
import { motion } from 'framer-motion';

export default function PillarSkeleton({ viewMode = 'table' }) {
    if (viewMode === 'table') {
        return (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <th key={i} className="px-6 py-4">
                                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3, 4, 5].map(row => (
                                <tr key={row} className="border-t border-gray-100">
                                    {[1, 2, 3, 4, 5].map(col => (
                                        <td key={col} className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {col === 1 && (
                                                    <>
                                                        <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
                                                        <div className="space-y-2">
                                                            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                                                            <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
                                                        </div>
                                                    </>
                                                )}
                                                {col === 2 && <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />}
                                                {col === 3 && <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />}
                                                {col === 4 && <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />}
                                                {col === 5 && <div className="h-4 bg-gray-200 rounded w-12 ml-auto animate-pulse" />}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-indigo-100"
                >
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-2xl animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
                            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {[1, 2, 3].map(j => (
                            <div key={j} className="text-center p-2 bg-gray-50 rounded-lg">
                                <div className="h-4 bg-gray-200 rounded w-8 mx-auto mb-2 animate-pulse" />
                                <div className="h-3 bg-gray-200 rounded w-12 mx-auto animate-pulse" />
                            </div>
                        ))}
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                </motion.div>
            ))}
        </div>
    );
}