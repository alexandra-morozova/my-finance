# Transaction File Import + AI Enrichment — Implementation Plan

**Status:** Proposed implementation plan; no feature code is implied by this document.
**Target stack:** Existing Express 5 + TypeScript backend, Prisma/PostgreSQL, React/Vite.
**Related:** [Transaction design](./transaction-design.md), [transaction backlog](./transaction-implementation.md), [backend contributor rules](../backend/AGENTS.md).

## 1. Goal

Extend MyFinance with a safe upload-and-review workflow for bank transaction statements. The user selects an owned account and uploads a supported file (start with CSV); the API creates an import session, the browser uploads file bytes directly to object storage through a short-lived presigned URL, and a worker later parses/validates the statement. AI may suggest merchant normalization or categories, but the user reviews suggestions before transactions are committed.

**Do not create a second backend.** Keep the feature in TypeScript/Express and follow the existing routes → controllers → services → repositories layering. Reuse existing account ownership checks and transaction import idempotency design.

## 2. Key decisions

1. **Object storage is behind an injected ObjectStorage interface.** The import service must not import AWS SDK classes or know how URLs, streams, or object metadata are implemented.
2. **Stage 1 includes the real Amazon S3 adapter and presigned URLs.** Use AWS SDK v3 to create signed PUT/GET URLs. The browser sends file bytes directly to S3; the API handles authorization, upload intents, completion verification and metadata only.
3. **Mock the storage dependency in Stage 1 tests.** Unit and API tests inject a MockObjectStorage / fake implementation so they run without AWS credentials or a live bucket. It implements the same interface and records objects/requests in memory. Do not add a pretend S3 HTTP endpoint to the application. Real S3 behavior is covered by adapter tests with a mocked AWS SDK client plus an optional opt-in integration test against a dedicated test bucket.
4. **The API never accepts an arbitrary object key from the client.** It generates a random import ID and server-owned key such as users/{userId}/transaction-imports/{importId}/source.csv. Do not use the original filename as a storage key.
5. **Presigned URLs are bearer capabilities.** Keep their TTL short, do not store them in the database, and do not log them. A presigned S3 URL may be reused until it expires; an upload-completion endpoint must therefore be idempotent. Enable S3 bucket versioning and persist the completed object version ID so processing can read the exact version that was verified.
6. **Verify upload completion server-side.** Do not trust client claims that an upload succeeded. Use HeadObject (S3) or the mock equivalent to verify existence, content type, expected size and checksum where configured before marking an import uploaded.
7. **AI does not commit money movement automatically.** AI enrichment returns structured suggestions; deterministic parsing/validation and explicit user review remain authoritative.

## 3. Upload and processing flow

1. Authenticated user selects an account they own and a statement file.
2. Frontend calls POST /transaction-imports/upload-intents with accountId, original display filename, allowed content type, declared byte size and optional SHA-256 checksum.
3. API validates the request, calls the existing account-ownership check, checks file-type and size allowlists, creates a TransactionImport row in AWAITING_UPLOAD, and generates the storage key itself.
4. API asks the injected storage adapter for a short-lived upload URL and returns importId, uploadUrl, method PUT, required signed headers, and expiresAt.
5. Browser performs a direct PUT of the file bytes to that URL using the exact signed headers. It must not proxy file bytes through the JSON API.
6. Frontend calls POST /transaction-imports/{id}/complete. API authenticates the caller, checks import ownership, verifies the object exists and matches the declared constraints, captures S3 VersionId / ETag / checksum as applicable, and atomically moves the import to UPLOADED. Repeated completion calls return the existing state and must not enqueue duplicate processing.
7. Background processing reads the verified object version through ObjectStorage, parses CSV, validates rows, detects duplicates and prepares a preview. Later stages can add PDF/OCR and AI enrichment.
8. The UI displays row-level validation errors and AI suggestions for review. Only a user-confirmed commit invokes the existing idempotent transaction-import service.
9. A separate authenticated download-url endpoint can provide a short-lived GET URL for the original file after checking import ownership.

For a file download, the API authorizes the user before signing a GET URL. Never treat possession of an import ID as authorization.

## 4. Storage adapter contract

Keep this small and tied to current use cases. Example conceptual contract (adapt names to existing code conventions):

- createPresignedUploadUrl({ key, contentType, expiresInSeconds, checksumSha256? }) returns URL, expiry and required headers.
- createPresignedDownloadUrl({ key, versionId?, expiresInSeconds, downloadFilename? }) returns URL and expiry.
- headObject({ key }) returns existence, byte size, content type, checksum / ETag and version ID.
- getObjectStream({ key, versionId? }) returns a readable stream for the worker/parser.
- deleteObject({ key, versionId? }) supports cleanup for expired or abandoned imports.

Use a TypeScript interface and inject an implementation into the service/composition root. Do not add a generic storage framework or unrelated abstractions.

### Stage 1 test double

- Implement MockObjectStorage for tests only. Mock object contents and metadata live in memory and can be inspected/reset between tests.
- MockObjectStorage must implement the same contract as S3ObjectStorage, including presign results, HEAD verification, stream reads and deletion.
- API/service tests inject the mock; they must not need AWS credentials or send file bytes through a new mock HTTP endpoint.
- A presigned URL returned by the fake is a harmless deterministic test URL; only the real adapter emits AWS S3 URLs.

## 5. S3 adapter and configuration (Stage 1)

Add only the AWS SDK v3 packages needed, expected to include @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner. Use PutObjectCommand, GetObjectCommand, HeadObjectCommand, and DeleteObjectCommand as required. Sign uploads with the expected content type (and checksum header when used) so the browser must send matching headers.

Configuration to add to centralized backend environment validation and .env.example:

- FILE_STORAGE_PROVIDER=s3 (runtime provider). Tests inject MockObjectStorage directly rather than enabling a fake provider in the runtime configuration.
- AWS_REGION.
- S3_BUCKET.
- PRESIGNED_UPLOAD_TTL_SECONDS (short, configurable; default 300 seconds).
- PRESIGNED_DOWNLOAD_TTL_SECONDS (short, configurable; default 120 seconds).

Use the AWS default credential chain / workload IAM role in deployed environments; never put AWS access keys in source control. Local AWS credentials may come from the developer's standard profile. Scope IAM permissions to the specific bucket and required prefix/actions. Keep S3 Block Public Access enabled, encrypt objects at rest, enable bucket versioning, and configure bucket CORS for the exact frontend origin with only needed methods and headers (at least PUT for upload; GET for browser download if used). Expose only response headers the browser needs, such as ETag or version ID if the implementation relies on them.

S3 presigned PUT does not by itself guarantee an uploaded object is the declared size. Validate size with HeadObject at completion; if strict pre-upload range enforcement is required, evaluate a presigned POST policy with content-length-range instead of assuming a client-side check is secure.

## 6. Persistence model

Introduce a TransactionImport record (and status enum) through a Prisma migration when implementation begins. Suggested fields:

- id (UUID), userId, accountId.
- status: AWAITING_UPLOAD, UPLOADED, PROCESSING, PREVIEW_READY, COMMITTED, FAILED, EXPIRED.
- originalFilename (display-only; sanitized), contentType, expectedSizeBytes, optional expected checksum.
- storageKey, optional storageVersionId, ETag/checksum observed by the server.
- created/updated/uploaded/expired timestamps and a safe internal error code (never a raw provider stack or sensitive contents).

Add user/account relations and indexes appropriate for listing a user's imports by date/status. Enforce account/import ownership at the service layer and prefer composite ownership constraints where compatible with the existing schema conventions. Do not store a presigned URL in PostgreSQL. Consider cleanup of abandoned AWAITING_UPLOAD rows and objects after expiry.

## 7. API proposal

All import routes require authentication. The actual S3 URLs are bearer capabilities, short-lived and returned only after the API has checked user/account authorization. There are no application routes for serving object bytes.

| Method | Path | Purpose |
|---|---|---|
| POST | /transaction-imports/upload-intents | Validate account/file metadata, create import session, return short-lived PUT URL. |
| POST | /transaction-imports/:id/complete | Verify uploaded object and transition idempotently to UPLOADED. |
| GET | /transaction-imports/:id | Return the caller's import status and safe metadata. |
| GET | /transaction-imports/:id/download-url | Authorize owner, then return a short-lived GET URL. |

Use existing validation, requireAuth, CSRF and error-handler conventions. Do not return storage credentials or raw provider errors. The complete endpoint must not accept a storage key, user ID or version ID from the client as authoritative values.

## 8. Implementation stages

The existing transaction backlog is phase-gated: Phase 3 manual transaction lifecycle is marked as the prerequisite before Phase 4 import. Preserve that ordering unless the product owner explicitly reprioritizes it. This plan describes the import feature stages, not permission to skip existing phase gates.

### Stage 1 — S3 storage contract + presigned upload APIs

- [ ] Add ObjectStorage interface and inject it into the transaction-import service.
- [ ] Implement S3ObjectStorage with presigned PUT/GET, HEAD verification, stream reads, version-aware reads and cleanup using AWS SDK v3.
- [ ] Implement MockObjectStorage as a test double; inject it into service and API tests (no fake public HTTP storage endpoint).
- [ ] Add validated S3 configuration and update .env.example. Use the AWS default credential chain / workload IAM role in deployed environments.
- [ ] Add upload-intent/completion/status API with strict ownership checks and a minimal Prisma migration for import sessions.
- [ ] Add tests for presign parameters/TTL, required content type, ownership/IDOR, metadata mismatch, missing object, duplicate completion and no URL/token leaks.
- [ ] Add an opt-in S3 integration test using a dedicated test bucket; keep it disabled by default in normal CI.
- [ ] Verify bucket CORS/IAM/versioning/encryption setup in infrastructure documentation.

**Exit criteria:** API contract and S3 adapter are implemented; ordinary tests run with the mock dependency and no AWS credentials; browser uploads directly to S3 when running with S3 configuration.

### Stage 2 — Parse and preview CSV

- [ ] Define allowed CSV encoding/delimiter/column mapping policy; stream large inputs and cap rows/bytes.
- [ ] Parse rows to validated transaction DTOs; preserve row numbers and original column values for error feedback.
- [ ] Store preview/error metadata without creating transactions yet.
- [ ] Detect duplicates and reuse the account-scoped DB uniqueness/upsert behavior from the transaction design.
- [ ] Add test fixtures for malformed CSV, empty files, invalid amounts/dates/currency, duplicate rows and large input.

**Exit criteria:** User can upload a CSV and receive a deterministic preview with row-level errors.

### Stage 3 — Review and commit

- [ ] Add React upload progress and preview/error table.
- [ ] Require explicit user confirmation before committing.
- [ ] Commit through the transaction import service using database-enforced idempotency.
- [ ] Make repeated commit requests safe and return stable created/updated/skipped counts.

**Exit criteria:** Accepted rows create at most one transaction per account/provider/external ID; rejected rows do not get committed.

### Stage 4 — AI enrichment

- [ ] Add an AIAnalyzer abstraction separate from storage and core import logic.
- [ ] Initially suggest merchant normalization and transaction category; do not let AI set amount, currency, account ownership or transaction identity.
- [ ] Require structured validated output, enforce input/output limits, redact where possible, and treat CSV cell contents as untrusted prompt data.
- [ ] Store model/provider/prompt version, result and validation outcome for debugging without logging full financial rows.
- [ ] Build a small labeled evaluation fixture and measure suggestion quality; keep suggestions reviewable and never auto-commit.

**Exit criteria:** AI suggestions are schema-valid, evidence-backed where applicable, measurable and explicitly reviewed by the user.

### Stage 5 — Production hardening

- [ ] Apply rate limits and upload-intent quotas; cap file size and processing time.
- [ ] Add cleanup for abandoned uploads, safe retries and durable processing jobs.
- [ ] Add structured operational logs/metrics without URLs, secrets or raw financial content.
- [ ] Test prompt injection in imported text, tenant isolation, presigned URL expiry and object-version integrity.
- [ ] Document recovery, retention and operational alerting.

**Exit criteria:** Document lifecycle and failures are observable and recoverable; access and data-retention policies are explicit.

## 9. Conflict resolution and concurrency policy

Retries and idempotency are necessary but do not by themselves define which result wins when two operations race. Resolve each conflict type deliberately.

### Conflict policy by scenario

| Scenario | Policy | Why |
|---|---|---|
| Two workers process the same import | Use guarded state transitions / a lease or claim, plus unique constraints for durable side effects. Workers must be idempotent. | At-least-once execution must not create duplicate transactions or conflicting previews. |
| Two requests complete the same upload | Treat completion as an idempotent state transition. The first verified transition to UPLOADED wins; repeats return the stored state. Reject completion after expiry or after a disallowed terminal state. | Browser retries and concurrent requests are normal. |
| Presigned URL is reused to upload different bytes | Use a unique, server-generated object key for each upload intent; enable S3 versioning and pin the exact verified VersionId when processing. Never process an unversioned “latest” object after completion. | S3 presigned URLs may be reused before expiry and PUT to an existing key can replace it. Version pinning stops a later overwrite from silently changing the bytes being processed. |
| Same bank transaction appears in overlapping imports | Let the database unique constraint on (accountId, externalProvider, externalId) arbitrate; use atomic upsert. Do not rely on check-then-insert. | Concurrent imports can race; the database is the final authority for uniqueness. |
| Imported provider data conflicts with user edits | Define field ownership. Provider/source fields (e.g. posted amount/date/status) may be refreshed from the source; user-owned enrichment (e.g. custom category or user memo) should be preserved unless the user explicitly resets it. | A sync should not silently destroy user-authored metadata. Document the field-by-field policy. |
| User edits the same record concurrently | For mutable records with a real concurrent-edit use case, use optimistic concurrency (version or updatedAt token). Update only if the token still matches; otherwise return HTTP 409 and let the client reload/reconcile. Use a DB transaction or constraint for invariants that span multiple rows. | Prevents silent lost updates without locking every edit. Do not add version columns everywhere without a concrete requirement. |
| AI analysis finishes after a reviewer changes a finding | Bind every result to a document version and analyzer/prompt version. Store AI suggestions separately from human review. If the source version changed, mark the result stale and rerun; never overwrite a newer human decision with an older AI response. | Human decisions and model suggestions have different authority. |
| A read is routed to a lagging replica after a write | Keep one authoritative writer. Route writes and consistency-sensitive/read-after-write queries to the primary; send only stale-tolerant queries to replicas. Define fallback when a replica is unhealthy or lag exceeds the product's tolerance. | Asynchronous replication may not make a committed write immediately visible on a replica. |
| Primary database fails over | Follow the managed database's single-writer failover/fencing behavior; ensure the old primary cannot continue accepting writes, refresh connection pools and expect bounded write unavailability. | Avoid split-brain writes and divergent histories. Read replicas are not multi-writer conflict resolution. |

### Conflict resolution principles

- **Prefer prevention for invariant violations.** Enforce uniqueness, foreign keys, and transactional invariants in PostgreSQL rather than trying to merge invalid states after the fact.
- **Use last-write-wins only when it is an explicit product decision.** It is inappropriate for financial amounts, transaction identity, or reviewer decisions where silently losing an update is unacceptable.
- **Use field-specific ownership rules for imports.** External bank facts and user-authored metadata have different sources of truth; do not apply a blanket “replace every field” upsert.
- **Preserve history for consequential changes.** Keep the original imported source and version, extraction/AI result versions, and reviewer events so a conflict can be understood later.
- **Return actionable conflicts.** Use a clear 409 response for stale edits or invalid concurrent state transitions where clients can reload or ask the user to reconcile. Retry automatically only when the operation is safe and the conflict policy is deterministic.
- **Do not build active-active multi-writer replication for this project by default.** With PostgreSQL primary/read replicas, writes are centralized. Consider multi-writer conflict-free data types or domain merge semantics only if multi-region writes become a true requirement.

For read replicas, initially use primary for all writes and transaction-scoped consistency-sensitive reads. Add replicas only when measurements show read capacity is a bottleneck; monitor lag and define the maximum staleness acceptable for each read path.

## 9. Required tests and security invariants

- User A cannot create an upload intent for User B's account, complete/read/download User B's import, or use an ID to learn whether another user's object exists.
- A client cannot choose or overwrite an arbitrary storage key.
- Presigned URLs expire; URLs are never persisted or logged.
- Upload completion verifies object metadata from storage and is idempotent; a client success claim alone cannot advance state.
- Processing reads the verified S3 version, not whichever object currently happens to be at the key.
- Tests use MockObjectStorage only as an injected dependency; no fake object-serving route is deployed.
- Unsupported/mislabelled files, excessive sizes, malformed content, stale imports and failed storage calls return safe errors.
- AI output cannot modify transaction amounts, currency, account IDs, import status or idempotency identifiers.
- Original documents are private; no public bucket/object ACL is used.

## 11. Out of scope for initial implementation

- PDF OCR and bank-statement layouts beyond CSV.
- Automatic bank API synchronization (already planned separately in transaction Phase 7).
- Automatic final transaction commits from AI predictions.
- Public object URLs, long-lived download URLs, or exposing AWS credentials to the frontend.
- Redis/BullMQ or multi-service split unless measured workload justifies them; follow current backend guidance and start with the simplest worker/job approach.
