-- Create alerts_sent table
-- This table tracks all alerts sent to users to prevent duplicates

CREATE TABLE IF NOT EXISTS alerts_sent (
    id SERIAL PRIMARY KEY,
    
    -- User who received the alert
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Signal that triggered the alert
    signal_id INTEGER NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type VARCHAR(50) NOT NULL,  -- immediate, digest
    severity VARCHAR(20) NOT NULL,    -- high, medium, low
    channel VARCHAR(50) NOT NULL,     -- email, telegram
    
    -- Message details
    subject VARCHAR(500),
    message_preview VARCHAR(1000),    -- First 1000 chars of message
    
    -- Delivery status
    sent_successfully BOOLEAN NOT NULL DEFAULT true,
    error_message VARCHAR(1000),
    
    -- External tracking
    external_message_id VARCHAR(255), -- Provider's message ID
    
    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_alerts_sent_user_id ON alerts_sent(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_sent_signal_id ON alerts_sent(signal_id);
CREATE INDEX IF NOT EXISTS idx_alerts_sent_user_signal ON alerts_sent(user_id, signal_id);
CREATE INDEX IF NOT EXISTS idx_alerts_sent_user_date ON alerts_sent(user_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_alerts_sent_type_channel ON alerts_sent(alert_type, channel);
CREATE INDEX IF NOT EXISTS idx_alerts_sent_sent_at ON alerts_sent(sent_at);

-- Add alert preference columns to users table (if they don't exist)
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS alert_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN DEFAULT true;

-- Success message
SELECT 'alerts_sent table created successfully!' AS status;
