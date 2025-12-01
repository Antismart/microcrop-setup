-- MicroCrop Data Processor - Database Schema
-- Planet Labs Integration and Plot Management

-- Enable TimescaleDB extension if not already enabled
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================================
-- Planet Labs Subscriptions Table
-- ============================================================
-- Stores Planet Labs Crop Biomass subscriptions for each policy
-- Privacy: GPS coordinates stored here, not on-chain
-- ============================================================

CREATE TABLE IF NOT EXISTS planet_subscriptions (
    id SERIAL PRIMARY KEY,
    subscription_id TEXT UNIQUE NOT NULL,
    policy_id TEXT NOT NULL,
    plot_id INTEGER NOT NULL,
    
    -- GPS Coordinates (PRIVATE - never exposed on-chain)
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- Field geometry (GeoJSON polygon)
    field_geometry JSONB NOT NULL,
    
    -- Subscription details
    product_type TEXT DEFAULT 'BIOMASS-PROXY_V4.0_10',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    
    -- Status tracking
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'failed')),
    
    -- Planet API response metadata
    planet_metadata JSONB,
    
    -- Audit timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    
    -- Indexes for fast lookups
    CONSTRAINT unique_active_policy UNIQUE (policy_id, status) WHERE status = 'active'
);

-- Indexes for performance
CREATE INDEX idx_planet_subscriptions_policy_id ON planet_subscriptions(policy_id);
CREATE INDEX idx_planet_subscriptions_plot_id ON planet_subscriptions(plot_id);
CREATE INDEX idx_planet_subscriptions_status ON planet_subscriptions(status);
CREATE INDEX idx_planet_subscriptions_subscription_id ON planet_subscriptions(subscription_id);
CREATE INDEX idx_planet_subscriptions_dates ON planet_subscriptions(start_date, end_date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_planet_subscriptions_updated_at
    BEFORE UPDATE ON planet_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Biomass Data Cache Table (Optional)
-- ============================================================
-- Cache biomass timeseries data to reduce Planet API calls
-- ============================================================

CREATE TABLE IF NOT EXISTS biomass_data_cache (
    id SERIAL PRIMARY KEY,
    plot_id INTEGER NOT NULL,
    subscription_id TEXT NOT NULL,
    
    -- Biomass measurements
    observation_date DATE NOT NULL,
    biomass_proxy DECIMAL(5, 4) NOT NULL CHECK (biomass_proxy >= 0 AND biomass_proxy <= 1),
    
    -- Data quality
    cloud_cover DECIMAL(4, 3) CHECK (cloud_cover >= 0 AND cloud_cover <= 1),
    data_quality TEXT CHECK (data_quality IN ('high', 'medium', 'low')),
    
    -- Metadata
    source TEXT DEFAULT 'planet_subscriptions_api',
    raw_data JSONB,
    
    -- Audit
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one observation per plot per date
    CONSTRAINT unique_plot_observation UNIQUE (plot_id, observation_date)
);

-- Indexes
CREATE INDEX idx_biomass_cache_plot_id ON biomass_data_cache(plot_id);
CREATE INDEX idx_biomass_cache_subscription_id ON biomass_data_cache(subscription_id);
CREATE INDEX idx_biomass_cache_date ON biomass_data_cache(observation_date DESC);
CREATE INDEX idx_biomass_cache_plot_date ON biomass_data_cache(plot_id, observation_date DESC);

-- Convert to TimescaleDB hypertable for efficient time-series queries
SELECT create_hypertable('biomass_data_cache', 'fetched_at', if_not_exists => TRUE);

-- ============================================================
-- Plot Locations Table (Privacy Layer)
-- ============================================================
-- Separate table for plot locations to enforce privacy
-- Only accessible via internal API
-- ============================================================

CREATE TABLE IF NOT EXISTS plot_locations (
    plot_id SERIAL PRIMARY KEY,
    policy_id TEXT NOT NULL,
    
    -- GPS coordinates (PRIVATE)
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- Field boundary (GeoJSON)
    field_geometry JSONB NOT NULL,
    
    -- Field metadata
    field_area_hectares DECIMAL(10, 4),
    field_name TEXT,
    
    -- Farmer information (optional)
    farmer_address TEXT,  -- Blockchain address
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: one location per policy
    CONSTRAINT unique_policy_location UNIQUE (policy_id)
);

-- Indexes
CREATE INDEX idx_plot_locations_policy_id ON plot_locations(policy_id);
CREATE INDEX idx_plot_locations_farmer ON plot_locations(farmer_address);

-- Trigger for updated_at
CREATE TRIGGER update_plot_locations_updated_at
    BEFORE UPDATE ON plot_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Subscription Status History (Audit Trail)
-- ============================================================
-- Track all subscription status changes for compliance
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_status_history (
    id SERIAL PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    reason TEXT,
    changed_by TEXT,  -- user_id or 'system'
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Indexes
CREATE INDEX idx_subscription_history_subscription_id ON subscription_status_history(subscription_id);
CREATE INDEX idx_subscription_history_changed_at ON subscription_status_history(changed_at DESC);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('subscription_status_history', 'changed_at', if_not_exists => TRUE);

-- ============================================================
-- Views for Easy Querying
-- ============================================================

-- Active subscriptions with plot details
CREATE OR REPLACE VIEW active_subscriptions_with_plots AS
SELECT 
    ps.subscription_id,
    ps.policy_id,
    ps.plot_id,
    ps.status,
    ps.start_date,
    ps.end_date,
    ps.product_type,
    ps.created_at,
    pl.field_area_hectares,
    pl.field_name,
    pl.farmer_address
FROM planet_subscriptions ps
LEFT JOIN plot_locations pl ON ps.plot_id = pl.plot_id
WHERE ps.status = 'active'
ORDER BY ps.created_at DESC;

-- Recent biomass observations
CREATE OR REPLACE VIEW recent_biomass_observations AS
SELECT 
    bc.plot_id,
    bc.subscription_id,
    bc.observation_date,
    bc.biomass_proxy,
    bc.cloud_cover,
    bc.data_quality,
    bc.fetched_at,
    ps.policy_id
FROM biomass_data_cache bc
JOIN planet_subscriptions ps ON bc.subscription_id = ps.subscription_id
WHERE bc.fetched_at > NOW() - INTERVAL '30 days'
ORDER BY bc.observation_date DESC;

-- ============================================================
-- Helper Functions
-- ============================================================

-- Function to get active subscription for a plot
CREATE OR REPLACE FUNCTION get_active_subscription(p_plot_id INTEGER)
RETURNS TABLE (
    subscription_id TEXT,
    policy_id TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.subscription_id,
        ps.policy_id,
        ps.start_date,
        ps.end_date,
        ps.status
    FROM planet_subscriptions ps
    WHERE ps.plot_id = p_plot_id
      AND ps.status = 'active'
    ORDER BY ps.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get latest biomass for a plot
CREATE OR REPLACE FUNCTION get_latest_biomass(p_plot_id INTEGER)
RETURNS TABLE (
    observation_date DATE,
    biomass_proxy DECIMAL,
    data_quality TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bc.observation_date,
        bc.biomass_proxy,
        bc.data_quality
    FROM biomass_data_cache bc
    WHERE bc.plot_id = p_plot_id
    ORDER BY bc.observation_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate biomass baseline
CREATE OR REPLACE FUNCTION calculate_biomass_baseline(
    p_plot_id INTEGER,
    p_days INTEGER DEFAULT 30
)
RETURNS DECIMAL AS $$
DECLARE
    baseline_value DECIMAL;
BEGIN
    SELECT AVG(biomass_proxy)
    INTO baseline_value
    FROM biomass_data_cache
    WHERE plot_id = p_plot_id
      AND observation_date >= CURRENT_DATE - p_days
      AND data_quality IN ('high', 'medium');
    
    RETURN COALESCE(baseline_value, 0.0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Data Retention Policies
-- ============================================================

-- Drop biomass data older than 3 years
CREATE OR REPLACE FUNCTION cleanup_old_biomass_data()
RETURNS void AS $$
BEGIN
    DELETE FROM biomass_data_cache
    WHERE fetched_at < NOW() - INTERVAL '3 years';
    
    RAISE NOTICE 'Cleaned up old biomass data';
END;
$$ LANGUAGE plpgsql;

-- Drop subscription history older than 5 years
CREATE OR REPLACE FUNCTION cleanup_old_subscription_history()
RETURNS void AS $$
BEGIN
    DELETE FROM subscription_status_history
    WHERE changed_at < NOW() - INTERVAL '5 years';
    
    RAISE NOTICE 'Cleaned up old subscription history';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Sample Data (for testing)
-- ============================================================

-- Uncomment to insert sample data for testing
/*
-- Sample plot location
INSERT INTO plot_locations (policy_id, latitude, longitude, field_geometry, field_area_hectares, field_name, farmer_address)
VALUES (
    'POLICY-TEST-001',
    -1.2921,
    36.8219,
    '{"type": "Polygon", "coordinates": [[[36.82, -1.29], [36.83, -1.29], [36.83, -1.30], [36.82, -1.30], [36.82, -1.29]]]}',
    5.5,
    'Test Farm Field 1',
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2'
)
ON CONFLICT (policy_id) DO NOTHING;

-- Sample subscription
INSERT INTO planet_subscriptions (subscription_id, policy_id, plot_id, latitude, longitude, field_geometry, start_date, end_date, status)
VALUES (
    'test-subscription-001',
    'POLICY-TEST-001',
    1,
    -1.2921,
    36.8219,
    '{"type": "Polygon", "coordinates": [[[36.82, -1.29], [36.83, -1.29], [36.83, -1.30], [36.82, -1.30], [36.82, -1.29]]]}',
    NOW(),
    NOW() + INTERVAL '120 days',
    'active'
)
ON CONFLICT (subscription_id) DO NOTHING;
*/

-- ============================================================
-- Grant Permissions (adjust as needed)
-- ============================================================

-- Grant permissions to application user
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO microcrop_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO microcrop_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO microcrop_app;

-- ============================================================
-- Comments for Documentation
-- ============================================================

COMMENT ON TABLE planet_subscriptions IS 'Planet Labs Crop Biomass subscriptions for parametric insurance policies';
COMMENT ON TABLE biomass_data_cache IS 'Cached biomass observation data from Planet Labs subscriptions';
COMMENT ON TABLE plot_locations IS 'Private GPS coordinates and field geometries - never exposed on-chain';
COMMENT ON TABLE subscription_status_history IS 'Audit trail of all subscription status changes';

COMMENT ON COLUMN planet_subscriptions.latitude IS 'PRIVATE: GPS latitude, never exposed on-chain';
COMMENT ON COLUMN planet_subscriptions.longitude IS 'PRIVATE: GPS longitude, never exposed on-chain';
COMMENT ON COLUMN planet_subscriptions.field_geometry IS 'GeoJSON polygon of field boundary';
COMMENT ON COLUMN planet_subscriptions.subscription_id IS 'Planet Labs subscription ID';
COMMENT ON COLUMN planet_subscriptions.plot_id IS 'Internal plot identifier used in smart contracts';

-- ============================================================
-- Migration Complete
-- ============================================================

\echo 'Database migration complete!'
\echo 'Tables created: planet_subscriptions, biomass_data_cache, plot_locations, subscription_status_history'
\echo 'Views created: active_subscriptions_with_plots, recent_biomass_observations'
\echo 'Functions created: get_active_subscription, get_latest_biomass, calculate_biomass_baseline'
