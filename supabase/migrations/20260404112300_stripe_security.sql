---------------------------------------------------------
-- OPTIMISATION STRIPE : IDEMPOTENCE & PERFORMANCE
---------------------------------------------------------

-- 1. Table de suivi des événements Stripe (Webhooks)
CREATE TABLE IF NOT EXISTS stripe_webhooks (
    id TEXT PRIMARY KEY, -- Stripe Event ID
    type TEXT NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'processed'
);

-- 2. Indexation de la table organizations pour Stripe
-- Recherche rapide par customer_id ou subscription_id
CREATE INDEX IF NOT EXISTS idx_orgs_stripe_customer_id ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_orgs_stripe_subscription_id ON organizations(stripe_subscription_id);

-- 3. Fonction Helper pour vérifier l'existence de l'événement
-- Utilisée par la Edge Function pour une vérification atomique
CREATE OR REPLACE FUNCTION register_stripe_event(p_event_id TEXT, p_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM stripe_webhooks WHERE id = p_event_id) THEN
        RETURN FALSE; -- Déjà traité
    END IF;

    INSERT INTO stripe_webhooks (id, type) VALUES (p_event_id, p_type);
    RETURN TRUE; -- Nouveau
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
