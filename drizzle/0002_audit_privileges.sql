-- Audit log bersifat append-only untuk role aplikasi.
-- Migrasi berjalan sebagai inventory_owner; role runtime tidak boleh mengubah/menghapus audit.
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "audit_logs" FROM "inventory_app";
GRANT SELECT, INSERT ON TABLE "audit_logs" TO "inventory_app";
