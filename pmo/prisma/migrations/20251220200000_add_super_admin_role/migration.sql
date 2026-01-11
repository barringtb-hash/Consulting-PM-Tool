-- Add SUPER_ADMIN to UserRole enum
-- Super Admins are internal platform operators with full cross-tenant access
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
