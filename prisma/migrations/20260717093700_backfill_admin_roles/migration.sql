-- Data migration: split the old single ADMIN role into the new tiered roles.
-- Promote the seeded/oldest admin to super admin; everyone else becomes a manager.
UPDATE "User" SET "role" = 'MANAGER' WHERE "role" = 'ADMIN';

UPDATE "User" SET "role" = 'SUPER_ADMIN'
WHERE "id" = (
  SELECT "id" FROM "User" WHERE "role" = 'MANAGER' ORDER BY "createdAt" ASC LIMIT 1
);
