// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'

export default function LoadingSpinner({ size = 'md', color = 'primary' }) {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    }

    const colors = {
        primary: 'border-primary-600 border-t-primary-200',
        white: 'border-white border-t-white/30',
        secondary: 'border-secondary-600 border-t-secondary-200'
    }

    return (
        <div className="flex justify-center items-center">
        <motion.div
            className={`${sizes[size]} rounded-full border-4 ${colors[color]}`}
            animate={{ rotate: 360 }}
            transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
            }}
        />
        </div>
    )
}