import React from 'react'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'

export default function SkeletonCard() {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-secondary-100">
        <motion.div
            className="space-y-4"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
            {/* Avatar skeleton */}
            <div className="w-16 h-16 bg-gradient-to-r from-secondary-200 to-secondary-300 rounded-2xl mx-auto" />
            
            {/* Title skeleton */}
            <div className="h-6 bg-gradient-to-r from-secondary-200 to-secondary-300 rounded-lg w-3/4 mx-auto" />
            
            {/* Text skeletons */}
            <div className="space-y-2">
            <div className="h-4 bg-gradient-to-r from-secondary-200 to-secondary-300 rounded w-full" />
            <div className="h-4 bg-gradient-to-r from-secondary-200 to-secondary-300 rounded w-5/6" />
            <div className="h-4 bg-gradient-to-r from-secondary-200 to-secondary-300 rounded w-4/6" />
            </div>
            
            {/* Button skeleton */}
            <div className="h-10 bg-gradient-to-r from-secondary-200 to-secondary-300 rounded-xl w-full" />
        </motion.div>
        </div>
    )
}