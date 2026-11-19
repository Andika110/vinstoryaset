-- Riwayat impor bersifat append-only untuk role aplikasi.
-- Migrasi berjalan sebagai inventory_owner; role runtime hanya boleh membaca dan menulis.
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "import_batches" FROM "inventory_app";
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "import_batch_rows" FROM "inventory_app";
GRANT SELECT, INSERT ON TABLE "import_batches" TO "inventory_app";
GRANT SELECT, INSERT ON TABLE "import_batch_rows" TO "inventory_app";
