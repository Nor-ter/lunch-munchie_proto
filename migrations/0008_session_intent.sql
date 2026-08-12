-- Persist the user's Lunchie mode (meal/cafe/dessert) so the shared server
-- slate can enforce the same hard category constraint for every participant.
ALTER TABLE sessions ADD COLUMN intent TEXT CHECK(intent IN ('meal', 'cafe', 'dessert') OR intent IS NULL);
