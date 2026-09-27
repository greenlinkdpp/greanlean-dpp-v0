# Publication integrity

Candidate Hash and Payload Hash are deliberately different:

- Candidate Hash identifies the resolved editable-source result reviewed by a human.
- Payload Hash identifies the canonical published content envelope, excluding the self-referential integrity value added by projection.

The payload uses the repository canonical JSON strategy and SHA-256. The database independently hashes the supplied canonical text and rejects mismatch. Published payload, canonical text, Schema Version, Candidate Hash, Payload Hash, Passport and Version number are database-immutable. Published rows cannot be deleted.

`GET /api/v2/passports/{id}/integrity` recomputes the canonical hash and returns only Passport ID, current Version, Payload Hash, Schema Version, publication time and integrity status.

