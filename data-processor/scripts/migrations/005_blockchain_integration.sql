-- MicroCrop Blockchain Integration Schema
-- Add tables for tracking oracle submissions and blockchain state

-- Oracle submissions tracking
CREATE TABLE IF NOT EXISTS oracle_submissions (
    submission_id BIGSERIAL PRIMARY KEY,
    data_type VARCHAR(50) NOT NULL,  -- 'weather', 'satellite', 'damage'
    plot_id BIGINT NOT NULL,
    policy_id BIGINT,  -- NULL for weather/satellite, set for damage assessments
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    
    -- Transaction details
    tx_hash VARCHAR(66) NOT NULL UNIQUE,  -- 0x + 64 hex chars
    block_number BIGINT NOT NULL,
    gas_used BIGINT NOT NULL,
    
    -- Status tracking
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMP,
    confirmation_status VARCHAR(20),  -- 'success', 'failed', 'pending'
    
    -- Metadata
    oracle_address VARCHAR(42) NOT NULL,  -- Submitter address
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- Indexes
    CONSTRAINT valid_data_type CHECK (data_type IN ('weather', 'satellite', 'damage'))
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_oracle_submissions_plot_id ON oracle_submissions(plot_id);
CREATE INDEX IF NOT EXISTS idx_oracle_submissions_policy_id ON oracle_submissions(policy_id) WHERE policy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oracle_submissions_data_type ON oracle_submissions(data_type);
CREATE INDEX IF NOT EXISTS idx_oracle_submissions_submitted_at ON oracle_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_oracle_submissions_tx_hash ON oracle_submissions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_oracle_submissions_unconfirmed ON oracle_submissions(confirmed_at) WHERE confirmed_at IS NULL;

-- Convert to TimescaleDB hypertable (if using TimescaleDB)
SELECT create_hypertable('oracle_submissions', 'submitted_at', if_not_exists => TRUE);

-- Damage assessments blockchain tracking
CREATE TABLE IF NOT EXISTS damage_assessments_blockchain (
    blockchain_assessment_id BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT,  -- References damage_assessments table
    policy_id BIGINT NOT NULL,
    
    -- On-chain assessment results
    damage_percentage INTEGER NOT NULL,  -- 0-100
    should_trigger BOOLEAN NOT NULL,
    
    -- Transaction details
    tx_hash VARCHAR(66) NOT NULL UNIQUE,
    block_number BIGINT NOT NULL,
    gas_used BIGINT NOT NULL,
    
    -- Timing
    assessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMP,
    
    -- Metadata
    oracle_address VARCHAR(42) NOT NULL,
    
    CONSTRAINT valid_damage_percentage CHECK (damage_percentage >= 0 AND damage_percentage <= 100)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_damage_blockchain_assessment_id ON damage_assessments_blockchain(assessment_id);
CREATE INDEX IF NOT EXISTS idx_damage_blockchain_policy_id ON damage_assessments_blockchain(policy_id);
CREATE INDEX IF NOT EXISTS idx_damage_blockchain_assessed_at ON damage_assessments_blockchain(assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_damage_blockchain_tx_hash ON damage_assessments_blockchain(tx_hash);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('damage_assessments_blockchain', 'assessed_at', if_not_exists => TRUE);

-- Blockchain transaction monitoring
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_id BIGSERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) NOT NULL UNIQUE,
    tx_type VARCHAR(50) NOT NULL,  -- 'weather_submit', 'satellite_submit', 'damage_assess'
    
    -- Transaction status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'confirmed', 'failed', 'replaced'
    block_number BIGINT,
    confirmations INTEGER DEFAULT 0,
    
    -- Gas and cost
    gas_limit BIGINT NOT NULL,
    gas_used BIGINT,
    gas_price_wei BIGINT,
    transaction_fee_wei BIGINT,
    
    -- Timing
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    mined_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    
    -- Error handling
    error_message TEXT,
    retry_of_tx VARCHAR(66),  -- If this is a retry, reference original tx
    replaced_by_tx VARCHAR(66),  -- If replaced by another tx
    
    -- Metadata
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    nonce BIGINT NOT NULL,
    chain_id INTEGER NOT NULL,
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'failed', 'replaced'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_hash ON blockchain_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_type ON blockchain_transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_status ON blockchain_transactions(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_submitted_at ON blockchain_transactions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_pending ON blockchain_transactions(status, submitted_at) WHERE status = 'pending';

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('blockchain_transactions', 'submitted_at', if_not_exists => TRUE);

-- Oracle account balance tracking (for monitoring gas costs)
CREATE TABLE IF NOT EXISTS oracle_balance_history (
    balance_id BIGSERIAL PRIMARY KEY,
    oracle_address VARCHAR(42) NOT NULL,
    balance_wei BIGINT NOT NULL,
    balance_eth DECIMAL(20, 8) NOT NULL,
    
    -- Context
    checked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    gas_spent_24h BIGINT,
    transactions_24h INTEGER,
    
    -- Alerts
    low_balance_alert BOOLEAN DEFAULT FALSE,
    alert_threshold_eth DECIMAL(20, 8) DEFAULT 0.1
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_oracle_balance_address ON oracle_balance_history(oracle_address);
CREATE INDEX IF NOT EXISTS idx_oracle_balance_checked_at ON oracle_balance_history(checked_at DESC);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('oracle_balance_history', 'checked_at', if_not_exists => TRUE);

-- Contract event log (for tracking on-chain events)
CREATE TABLE IF NOT EXISTS contract_events (
    event_id BIGSERIAL PRIMARY KEY,
    contract_address VARCHAR(42) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    
    -- Event details
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    
    -- Event data (JSON)
    event_data JSONB NOT NULL,
    decoded_args JSONB,
    
    -- Timing
    block_timestamp TIMESTAMP NOT NULL,
    indexed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    
    UNIQUE(tx_hash, log_index)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contract_events_contract ON contract_events(contract_address);
CREATE INDEX IF NOT EXISTS idx_contract_events_name ON contract_events(event_name);
CREATE INDEX IF NOT EXISTS idx_contract_events_tx_hash ON contract_events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_contract_events_block_number ON contract_events(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_contract_events_timestamp ON contract_events(block_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_contract_events_unprocessed ON contract_events(processed, indexed_at) WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_contract_events_data ON contract_events USING gin(event_data);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('contract_events', 'block_timestamp', if_not_exists => TRUE);

-- View for recent oracle activity
CREATE OR REPLACE VIEW v_recent_oracle_activity AS
SELECT 
    os.submission_id,
    os.data_type,
    os.plot_id,
    os.policy_id,
    os.tx_hash,
    os.block_number,
    os.gas_used,
    os.submitted_at,
    os.confirmed_at,
    os.confirmation_status,
    EXTRACT(EPOCH FROM (os.confirmed_at - os.submitted_at)) as confirmation_time_seconds,
    os.oracle_address
FROM oracle_submissions os
WHERE os.submitted_at >= NOW() - INTERVAL '7 days'
ORDER BY os.submitted_at DESC;

-- View for pending blockchain transactions
CREATE OR REPLACE VIEW v_pending_transactions AS
SELECT 
    bt.tx_hash,
    bt.tx_type,
    bt.status,
    bt.confirmations,
    bt.submitted_at,
    EXTRACT(EPOCH FROM (NOW() - bt.submitted_at)) as pending_seconds,
    bt.gas_limit,
    bt.gas_price_wei,
    bt.from_address,
    bt.to_address,
    bt.error_message
FROM blockchain_transactions bt
WHERE bt.status = 'pending'
    AND bt.submitted_at >= NOW() - INTERVAL '1 hour'
ORDER BY bt.submitted_at ASC;

-- View for oracle gas usage statistics
CREATE OR REPLACE VIEW v_oracle_gas_stats AS
SELECT 
    os.data_type,
    COUNT(*) as submission_count,
    SUM(os.gas_used) as total_gas,
    AVG(os.gas_used)::BIGINT as avg_gas,
    MIN(os.gas_used) as min_gas,
    MAX(os.gas_used) as max_gas,
    COUNT(DISTINCT os.plot_id) as unique_plots,
    MIN(os.submitted_at) as first_submission,
    MAX(os.submitted_at) as last_submission
FROM oracle_submissions os
WHERE os.submitted_at >= NOW() - INTERVAL '30 days'
    AND os.confirmation_status = 'success'
GROUP BY os.data_type;

-- View for damage assessment summary
CREATE OR REPLACE VIEW v_damage_assessments_summary AS
SELECT 
    dab.policy_id,
    dab.damage_percentage,
    dab.should_trigger,
    dab.tx_hash,
    dab.block_number,
    dab.gas_used,
    dab.assessed_at,
    dab.confirmed_at,
    EXTRACT(EPOCH FROM (dab.confirmed_at - dab.assessed_at)) as confirmation_time_seconds
FROM damage_assessments_blockchain dab
WHERE dab.assessed_at >= NOW() - INTERVAL '30 days'
ORDER BY dab.assessed_at DESC;

-- Function to check oracle balance and alert
CREATE OR REPLACE FUNCTION check_oracle_balance(
    p_oracle_address VARCHAR(42),
    p_current_balance_wei BIGINT,
    p_alert_threshold_eth DECIMAL DEFAULT 0.1
) RETURNS BOOLEAN AS $$
DECLARE
    v_balance_eth DECIMAL(20, 8);
    v_needs_alert BOOLEAN;
    v_gas_spent_24h BIGINT;
    v_tx_count_24h INTEGER;
BEGIN
    -- Convert wei to ETH
    v_balance_eth := p_current_balance_wei / 1000000000000000000.0;
    
    -- Check if balance is below threshold
    v_needs_alert := v_balance_eth < p_alert_threshold_eth;
    
    -- Get 24h gas usage
    SELECT 
        COALESCE(SUM(gas_used), 0),
        COUNT(*)
    INTO v_gas_spent_24h, v_tx_count_24h
    FROM oracle_submissions
    WHERE oracle_address = p_oracle_address
        AND submitted_at >= NOW() - INTERVAL '24 hours';
    
    -- Insert balance record
    INSERT INTO oracle_balance_history (
        oracle_address,
        balance_wei,
        balance_eth,
        checked_at,
        gas_spent_24h,
        transactions_24h,
        low_balance_alert,
        alert_threshold_eth
    ) VALUES (
        p_oracle_address,
        p_current_balance_wei,
        v_balance_eth,
        NOW(),
        v_gas_spent_24h,
        v_tx_count_24h,
        v_needs_alert,
        p_alert_threshold_eth
    );
    
    RETURN v_needs_alert;
END;
$$ LANGUAGE plpgsql;

-- Function to get oracle statistics
CREATE OR REPLACE FUNCTION get_oracle_stats(
    p_hours INTEGER DEFAULT 24
) RETURNS TABLE (
    data_type VARCHAR,
    submission_count BIGINT,
    total_gas BIGINT,
    avg_gas BIGINT,
    unique_plots BIGINT,
    success_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        os.data_type,
        COUNT(*)::BIGINT as submission_count,
        SUM(os.gas_used)::BIGINT as total_gas,
        AVG(os.gas_used)::BIGINT as avg_gas,
        COUNT(DISTINCT os.plot_id)::BIGINT as unique_plots,
        (COUNT(*) FILTER (WHERE os.confirmation_status = 'success')::DECIMAL / 
         NULLIF(COUNT(*), 0)) as success_rate
    FROM oracle_submissions os
    WHERE os.submitted_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY os.data_type;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE oracle_submissions IS 'Tracks all data submissions to blockchain oracles';
COMMENT ON TABLE damage_assessments_blockchain IS 'Tracks damage assessments performed on-chain';
COMMENT ON TABLE blockchain_transactions IS 'Monitors all blockchain transaction status';
COMMENT ON TABLE oracle_balance_history IS 'Historical record of oracle account balance for gas monitoring';
COMMENT ON TABLE contract_events IS 'Logs contract events emitted by smart contracts';

COMMENT ON FUNCTION check_oracle_balance IS 'Checks oracle balance and records in history with alert flag';
COMMENT ON FUNCTION get_oracle_stats IS 'Returns oracle submission statistics for specified time period';
