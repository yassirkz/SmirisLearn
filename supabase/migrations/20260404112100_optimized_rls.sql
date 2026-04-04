---------------------------------------------------------
-- MIGRATION : RLS OPTIMISÉ (JWT CLAIMS)
---------------------------------------------------------

-- 1. HELPERS DE SÉCURITÉ (ACCÈS RAPIDE AUX CLAIMS)
---------------------------------------------------------
CREATE OR REPLACE FUNCTION get_auth_org_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS TEXT AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$ LANGUAGE sql STABLE;

---------------------------------------------------------
-- 2. INFRASTRUCTURE DE SYNCHRONISATION
---------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_user_metadata_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    raw_app_meta_data || 
    jsonb_build_object(
      'role', NEW.role,
      'org_id', NEW.organization_id
    )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_user_metadata ON profiles;
CREATE TRIGGER tr_sync_user_metadata
AFTER INSERT OR UPDATE OF role, organization_id ON profiles
FOR EACH ROW EXECUTE FUNCTION sync_user_metadata_to_auth();

-- RATTRAPAGE INITIAL (Backfill pour les utilisateurs existants)
UPDATE auth.users u
SET raw_app_meta_data = 
  u.raw_app_meta_data || 
  jsonb_build_object(
    'role', p.role,
    'org_id', p.organization_id
  )
FROM profiles p
WHERE u.id = p.id;

---------------------------------------------------------
-- 3. REFACTORING DES POLITIQUES RLS
---------------------------------------------------------

-- A. Table : PROFILES
-----------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_org" ON profiles;
CREATE POLICY "profiles_select_own_org" ON profiles
FOR SELECT USING (
  organization_id = get_auth_org_id()
);

DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
CREATE POLICY "profiles_admin_all" ON profiles
FOR ALL USING (
  organization_id = get_auth_org_id() 
  AND get_auth_role() IN ('org_admin', 'super_admin')
);

-- B. Table : PILLARS
----------------------
ALTER TABLE pillars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pillars_select_org" ON pillars;
CREATE POLICY "pillars_select_org" ON pillars
FOR SELECT USING (
  organization_id = get_auth_org_id()
);

DROP POLICY IF EXISTS "pillars_admin_write" ON pillars;
CREATE POLICY "pillars_admin_write" ON pillars
FOR ALL USING (
  organization_id = get_auth_org_id()
  AND get_auth_role() IN ('org_admin', 'super_admin')
);

-- C. Table : VIDEOS
---------------------
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "videos_select_via_pillar" ON videos;
CREATE POLICY "videos_select_via_pillar" ON videos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pillars p 
    WHERE p.id = videos.pillar_id 
    AND p.organization_id = get_auth_org_id()
  )
);

DROP POLICY IF EXISTS "videos_admin_write" ON videos;
CREATE POLICY "videos_admin_write" ON videos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pillars p 
    WHERE p.id = videos.pillar_id 
    AND p.organization_id = get_auth_org_id()
    AND get_auth_role() IN ('org_admin', 'super_admin')
  )
);

-- D. Table : USER_PROGRESS
----------------------------
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_personal_access" ON user_progress;
CREATE POLICY "progress_personal_access" ON user_progress
FOR ALL USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "progress_admin_view" ON user_progress;
CREATE POLICY "progress_admin_view" ON user_progress
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = user_progress.user_id 
    AND p.organization_id = get_auth_org_id()
    AND get_auth_role() IN ('org_admin', 'super_admin')
  )
);

---------------------------------------------------------
-- FIN DE LA MIGRATION
---------------------------------------------------------
