import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const UserRoleContext = createContext();

export const UserRoleProvider = ({ children }) => {
    const { user } = useAuth();
    const [role, setRole] = useState(null);
    const [organizationId, setOrganizationId] = useState(null);
    const [isAdminAccess, setIsAdminAccess] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchRoleData = useCallback(async () => {
        if (!user) {
            setRole(null);
            setOrganizationId(null);
            setIsAdminAccess(false);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('role, organization_id')
                .eq('id', user.id)
                .maybeSingle();

            if (error) throw error;

            const finalRole = profile?.role || user.user_metadata?.role || 'student';
            const finalOrgId = profile?.organization_id || user.user_metadata?.organization_id;

            setRole(finalRole);
            setOrganizationId(finalOrgId);
            setIsAdminAccess(['super_admin', 'org_admin'].includes(finalRole));
        } catch (err) {
            console.error('Error fetching role data:', err);
            setRole('student');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchRoleData();
    }, [fetchRoleData]);

    const value = useMemo(() => ({
        role,
        organizationId,
        isAdminAccess,
        loading,
        refreshRole: fetchRoleData
    }), [role, organizationId, isAdminAccess, loading, fetchRoleData]);

    return (
        <UserRoleContext.Provider value={value}>
            {children}
        </UserRoleContext.Provider>
    );
};

export const useUserRole = () => {
    const context = useContext(UserRoleContext);
    if (!context) {
        throw new Error('useUserRole must be used within a UserRoleProvider');
    }
    return context;
};
