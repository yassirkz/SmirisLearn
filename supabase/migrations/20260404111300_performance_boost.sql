---------------------------------------------------------
-- PHASE 1 : INDEXATION & OPTIMISATION RLS
---------------------------------------------------------

-- 1. Indexation sur les Foreign Keys (Fondation de performance)
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_pillars_organization_id ON pillars(organization_id);
CREATE INDEX IF NOT EXISTS idx_videos_pillar_id ON videos(pillar_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_video_id ON quizzes(video_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_video_id ON user_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_composite ON user_progress(user_id, video_id);

-- 2. Indexation Temporelle (Optimisation statistiques & growth %)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- 2. Optimisation RLS ( Row Level Security )
-- Au lieu de faire des joins dans chaque politique, il est recommandé d'utiliser
-- les claims JWT ou des indices déjà existants.

---------------------------------------------------------
-- PHASE 2 : MATÉRIALISATION DU DASHBOARD (CACHE)
---------------------------------------------------------

-- 1. Table de Cache pour les Stats d'Organisation
CREATE TABLE IF NOT EXISTS admin_dashboard_stats (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    total_members INTEGER DEFAULT 0,
    total_videos INTEGER DEFAULT 0,
    total_quizzes INTEGER DEFAULT 0,
    avg_score NUMERIC(5,2) DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Fonction de Synchronisation Automatique (Triggers)
CREATE OR REPLACE FUNCTION sync_admin_dashboard_stats() 
RETURNS TRIGGER AS $$
DECLARE 
    target_org_id UUID;
BEGIN
    -- Détection de l'orgId de l'objet impacté
    IF (TG_TABLE_NAME = 'profiles') THEN 
        target_org_id := COALESCE(NEW.organization_id, OLD.organization_id);
    ELSIF (TG_TABLE_NAME = 'pillars') THEN 
        target_org_id := COALESCE(NEW.organization_id, OLD.organization_id);
    ELSIF (TG_TABLE_NAME = 'videos') THEN
        SELECT organization_id INTO target_org_id FROM pillars WHERE id = COALESCE(NEW.pillar_id, OLD.pillar_id);
    ELSIF (TG_TABLE_NAME = 'quizzes') THEN
        SELECT p.organization_id INTO target_org_id 
        FROM pillars p 
        JOIN videos v ON v.pillar_id = p.id 
        WHERE v.id = COALESCE(NEW.video_id, OLD.video_id);
    END IF;

    IF (target_org_id IS NULL) THEN RETURN NULL; END IF;

    -- Initialisation si n'existe pas
    INSERT INTO admin_dashboard_stats (organization_id)
    VALUES (target_org_id)
    ON CONFLICT (organization_id) DO NOTHING;

    -- Mise à jour globale atomique
    UPDATE admin_dashboard_stats
    SET 
        total_members = (SELECT count(*) FROM profiles WHERE organization_id = target_org_id),
        total_videos = (SELECT count(*) FROM videos v JOIN pillars p ON v.pillar_id = p.id WHERE p.organization_id = target_org_id),
        total_quizzes = (SELECT count(*) FROM quizzes q JOIN videos v ON q.video_id = v.id JOIN pillars p ON v.pillar_id = p.id WHERE p.organization_id = target_org_id),
        last_updated = NOW()
    WHERE organization_id = target_org_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attachement des Triggers
DROP TRIGGER IF EXISTS tr_sync_stats_profiles ON profiles;
CREATE TRIGGER tr_sync_stats_profiles
AFTER INSERT OR DELETE OR UPDATE OF organization_id ON profiles
FOR EACH ROW EXECUTE FUNCTION sync_admin_dashboard_stats();

DROP TRIGGER IF EXISTS tr_sync_stats_pillars ON pillars;
CREATE TRIGGER tr_sync_stats_pillars
AFTER INSERT OR DELETE ON pillars
FOR EACH ROW EXECUTE FUNCTION sync_admin_dashboard_stats();

DROP TRIGGER IF EXISTS tr_sync_stats_videos ON videos;
CREATE TRIGGER tr_sync_stats_videos
AFTER INSERT OR DELETE ON videos
FOR EACH ROW EXECUTE FUNCTION sync_admin_dashboard_stats();

DROP TRIGGER IF EXISTS tr_sync_stats_quizzes ON quizzes;
CREATE TRIGGER tr_sync_stats_quizzes
AFTER INSERT OR DELETE ON quizzes
FOR EACH ROW EXECUTE FUNCTION sync_admin_dashboard_stats();

-- 4. RPC Dashboard v2 (Optimisée et utilisant le cache)
CREATE OR REPLACE FUNCTION get_organization_dashboard_v2(p_org_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    v_prev_members INTEGER;
    v_prev_videos INTEGER;
    v_prev_quizzes INTEGER;
    v_curr_members INTEGER;
    v_curr_videos INTEGER;
    v_curr_quizzes INTEGER;
BEGIN
    -- Récupération des stats actuelles depuis le cache
    SELECT 
        total_members, total_videos, total_quizzes 
    INTO 
        v_curr_members, v_curr_videos, v_curr_quizzes
    FROM admin_dashboard_stats 
    WHERE organization_id = p_org_id;

    -- Calcul des stats du mois précédent pour les pourcentages (Utilisation des index idx_X_created_at)
    SELECT count(*) INTO v_prev_members FROM profiles 
    WHERE organization_id = p_org_id AND created_at < date_trunc('month', now());
    
    SELECT count(*) INTO v_prev_videos FROM videos v 
    JOIN pillars p ON v.pillar_id = p.id 
    WHERE p.organization_id = p_org_id AND v.created_at < date_trunc('month', now());

    SELECT count(*) INTO v_prev_quizzes FROM quizzes q 
    JOIN videos v ON q.video_id = v.id 
    JOIN pillars p ON v.pillar_id = p.id 
    WHERE p.organization_id = p_org_id AND q.created_at < date_trunc('month', now());

    SELECT json_build_object(
        'organization', (SELECT json_build_object('id', id, 'name', name, 'plan_type', plan_type) FROM organizations WHERE id = p_org_id),
        'stats', (
            SELECT json_build_object(
                'total_members', v_curr_members,
                'total_videos', v_curr_videos,
                'total_quizzes', v_curr_quizzes,
                'growth_members', CASE WHEN v_prev_members > 0 THEN ((v_curr_members - v_prev_members)::float / v_prev_members * 100)::int ELSE 0 END,
                'growth_videos', CASE WHEN v_prev_videos > 0 THEN ((v_curr_videos - v_prev_videos)::float / v_prev_videos * 100)::int ELSE 0 END,
                'growth_quizzes', CASE WHEN v_prev_quizzes > 0 THEN ((v_curr_quizzes - v_prev_quizzes)::float / v_prev_quizzes * 100)::int ELSE 0 END,
                'avg_score', (SELECT avg_score FROM admin_dashboard_stats WHERE organization_id = p_org_id)
            )
        ),
        'recent_activities', (
            SELECT json_agg(t) FROM (
                SELECT n.title as description, n.created_at as timestamp 
                FROM notifications n
                JOIN profiles p ON n.user_id = p.id
                WHERE p.organization_id = p_org_id 
                ORDER BY n.created_at DESC LIMIT 5
            ) t
        ),
        'top_students', (
          -- Filtre : Uniquement les étudiants (rôle 'student')
          SELECT json_agg(u) FROM (
            SELECT p.full_name as name, COALESCE(AVG(up.quiz_score), 0)::int as completion
            FROM profiles p
            LEFT JOIN user_progress up ON p.id = up.user_id
            WHERE p.organization_id = p_org_id AND p.role = 'student'
            GROUP BY p.id, p.full_name
            ORDER BY completion DESC LIMIT 5
          ) u
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
