import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse rounded-full" />
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full"
                    />
                </div>
            </div>
        )
    }

    if (!user) {
        // Redirect them to the /signin page, but save the current location they were
        // trying to go to. This allows us to send them back to that page after they login.
        return <Navigate to="/signin" state={{ from: location }} replace />
    }

    return children
}
