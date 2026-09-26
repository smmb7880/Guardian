-- Phase 6 Versioned Policy Engine Database Schema Migration

CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE UNIQUE,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    current_version INT NOT NULL DEFAULT 1,
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    daily_limit_minutes INT NOT NULL DEFAULT 120,
    bedtime JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policy_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    version INT NOT NULL,
    policy_snapshot JSONB NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_policy_version UNIQUE (policy_id, version)
);

CREATE TABLE IF NOT EXISTS policy_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('APP', 'WEBSITE', 'CATEGORY', 'SCHEDULE')),
    rule_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS temporary_allowances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    duration_minutes INT NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_policies_child ON policies(child_id);
CREATE INDEX IF NOT EXISTS idx_policies_family ON policies(family_id);
CREATE INDEX IF NOT EXISTS idx_policy_versions_policy ON policy_versions(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_rules_policy ON policy_rules(policy_id);
CREATE INDEX IF NOT EXISTS idx_temporary_allowances_policy ON temporary_allowances(policy_id);
CREATE INDEX IF NOT EXISTS idx_temporary_allowances_expires ON temporary_allowances(expires_at);
