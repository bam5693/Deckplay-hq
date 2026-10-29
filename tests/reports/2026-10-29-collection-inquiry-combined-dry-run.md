# Collection inquiry combined production-schema dry run — 2026-10-29

Executed against production project yffruutknztvdyioovmp in a single transaction ending in ROLLBACK; **not a deployment**.

Inputs, in order:
1. production-preview-additive-columns-candidate.sql
2. production-preview-collection-inquiries-candidate.sql
3. production-preview-collection-inquiry-rpc-candidate.sql

Each candidate's outer BEGIN/COMMIT was stripped and replaced with one encompassing BEGIN / SELECT / ROLLBACK.

Observed verification query:
- has_schema_privilege('authenticated','private','USAGE') = true
- has_function_privilege('authenticated','private.send_collection_inquiry(uuid,text,text,text)','EXECUTE') = true
- has_function_privilege('anon','public.send_collection_inquiry(uuid,text,text,text)','EXECUTE') = false

The SQL tool returned successful results. No persistent DDL was requested. This verifies DDL compatibility and privilege state **inside the transaction only**, not successful authenticated message delivery.

Remaining release gates: independently verified restore of production backup to isolated database; authenticated staging/clone functional checks, RLS and security-definer audit, production schema differences and storage review. Do not deploy or merge on this result alone.
