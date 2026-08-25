-- GIN trigram indexes for partial search (Spec 37: ELC, Electronic, 511S)
CREATE INDEX IF NOT EXISTS "idx_modules_code_trgm" ON "modules" USING gin ("code" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_modules_name_trgm" ON "modules" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_programmes_name_trgm" ON "programmes" USING gin ("name" gin_trgm_ops);
