-- ---------------------------------------------------------
-- MIGRATION : DURCISSEMENT SÉCURITÉ (HARDENING)
-- ---------------------------------------------------------

-- 1. RENFORCEMENT DE L'ISOLATION PROFILES
---------------------------------------------------------
-- Les étudiants ne doivent voir QUE leur propre profil.
-- Les admins voient tout leur tenant.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_org" ON profiles;
CREATE POLICY "profiles_select_restricted" ON profiles
FOR SELECT USING (
  (id = auth.uid()) OR -- Accès personnel
  (organization_id = get_auth_org_id() AND get_auth_role() IN ('org_admin', 'super_admin')) -- Accès Admin
);

-- 2. SÉCURISATION DE LA TABLE ORGANIZATIONS
---------------------------------------------------------
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_own" ON organizations;
CREATE POLICY "org_select_own" ON organizations
FOR SELECT USING (
  id = get_auth_org_id() OR 
  get_auth_role() = 'super_admin'
);

-- 3. SÉCURISATION DES INVITATIONS
---------------------------------------------------------
ALTER TABLE member_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations_admin_all" ON member_invitations;
CREATE POLICY "invitations_admin_all" ON member_invitations
FOR ALL USING (
  organization_id = get_auth_org_id() AND 
  get_auth_role() IN ('org_admin', 'super_admin')
);

DROP POLICY IF EXISTS "invitations_public_select" ON member_invitations;
CREATE POLICY "invitations_public_select" ON member_invitations
FOR SELECT USING (true); -- Nécessaire pour vérifier l'invitation par token sans être loggé

-- 4. ÉTENSION DES AUDIT LOGS (Triggers de sécurité)
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id),
    target_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    org_id UUID REFERENCES organizations(id)
);

CREATE OR REPLACE FUNCTION log_security_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO security_audit_log (actor_id, target_id, action, entity_type, old_data, new_data, org_id)
    VALUES (
        auth.uid(),
        NEW.id,
        TG_OP,
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        to_jsonb(NEW),
        COALESCE(NEW.organization_id, get_auth_org_id())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Logger les changements de rôles et les créations de comptes
DROP TRIGGER IF EXISTS tr_audit_profile_changes ON profiles;
CREATE TRIGGER tr_audit_profile_changes
AFTER INSERT OR UPDATE OF role ON profiles
FOR EACH ROW EXECUTE FUNCTION log_security_event();

-- 5. TABLE DE RATE LIMITING SERVEUR
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL, -- ex: 'signup:ip_address' ou 'login:email'
    action TEXT NOT NULL,
    attempts INTEGER DEFAULT 1,
    last_attempt TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(key, action)
);

CREATE OR REPLACE FUNCTION check_rate_limit(
    p_key TEXT,
    p_action TEXT,
    p_max_attempts INTEGER,
    p_window_interval INTERVAL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_attempts INTEGER;
    v_expires TIMESTAMPTZ;
BEGIN
    -- Nettoyage des entrées expirées
    DELETE FROM rate_limits WHERE expires_at < NOW();

    INSERT INTO rate_limits (key, action, expires_at)
    VALUES (p_key, p_action, NOW() + p_window_interval)
    ON CONFLICT (key, action) DO UPDATE
    SET 
        attempts = rate_limits.attempts + 1,
        last_attempt = NOW()
    RETURNING attempts INTO v_attempts;

    IF v_attempts > p_max_attempts THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
