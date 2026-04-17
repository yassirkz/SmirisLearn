import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function ImpersonationBanner() {
    const { user, stopImpersonation } = useAuth();

    if (!user || !user.isImpersonated) return null;

    return (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-bold flex flex-wrap items-center justify-center gap-4 sticky top-0 z-[100] shadow-md border-b border-amber-600">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            <span>
                Mode Impersonation : Vous naviguez en tant que <span className="underline truncate">{user.email}</span>
            </span>
            <button 
                onClick={stopImpersonation}
                className="bg-white text-amber-600 px-4 py-1.5 rounded-lg text-xs hover:bg-amber-50 transition-colors flex items-center gap-2 shadow-sm font-extrabold"
            >
                <LogOut className="w-4 h-4" />
                Quitter le mode
            </button>
        </div>
    );
}
