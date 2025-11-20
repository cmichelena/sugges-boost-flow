-- Add database constraint to ensure anonymous submissions have null user_id
ALTER TABLE suggestions ADD CONSTRAINT anonymous_user_id_check 
CHECK (NOT is_anonymous OR user_id IS NULL);