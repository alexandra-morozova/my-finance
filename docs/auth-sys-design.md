
flowchart TB
    Browser["Web Browser<br/>Opaque HttpOnly Secure Cookie<br/>No OAuth tokens"]
    WAF["Load Balancer / WAF<br/>HTTPS · DDoS Protection"]

    subgraph APP["Application Layer — Multi-AZ BFF"]
        subgraph AZA["Availability Zone A"]
            BFF1["BFF Instance A<br/>Node.js / NestJS"]
        end
        subgraph AZB["Availability Zone B"]
            BFF2["BFF Instance B<br/>Node.js / NestJS"]
        end
        subgraph AZC["Availability Zone C"]
            BFF3["BFF Instance C<br/>Node.js / NestJS"]
        end
    end

    IDP["Identity Provider<br/>OAuth 2.0 / OIDC<br/>Authentication · Token Refresh · Revocation"]
    API["Banking APIs<br/>Token Validation<br/>Account & Transaction Authorization"]

    subgraph CACHE["Redis — Highly Available Cluster"]
        R1["Primary"]
        R2["Replica — AZ B"]
        R3["Replica — AZ C"]
        R1 <-->|Replication / Failover| R2
        R2 <-->|Replication / Failover| R3
    end

    subgraph DB["PostgreSQL — Highly Available Cluster"]
        P1["Primary"]
        P2["Synchronous Replica — AZ B"]
        P3["Replica — AZ C"]
        P1 <-->|Replication / Failover| P2
        P2 <-->|Replication| P3
    end

    subgraph VAULT["Token Vault — HA Service"]
        TV["Encrypted Token Storage<br/>Refresh Rotation<br/>Concurrency Control"]
    end

    KMS["KMS / HSM<br/>Key Management<br/>Encryption / Decryption"]
    AUDIT["Durable Audit Pipeline<br/>Outbox · Reliable Delivery<br/>Security Event Retention"]
    MON["Monitoring / SIEM<br/>Metrics · Alerts · Traces<br/>No Secrets in Logs"]

    Browser -->|"HTTPS + session cookie"| WAF
    WAF --> BFF1
    WAF --> BFF2
    WAF --> BFF3

    BFF1 <-->|"Login / Refresh / Revoke"| IDP
    BFF2 <-->|"Login / Refresh / Revoke"| IDP
    BFF3 <-->|"Login / Refresh / Revoke"| IDP

    BFF1 -->|"Bearer access token"| API
    BFF2 -->|"Bearer access token"| API
    BFF3 -->|"Bearer access token"| API

    BFF1 <--> CACHE
    BFF2 <--> CACHE
    BFF3 <--> CACHE

    BFF1 <--> DB
    BFF2 <--> DB
    BFF3 <--> DB

    BFF1 <--> TV
    BFF2 <--> TV
    BFF3 <--> TV

    TV <--> KMS

    DB -->|"Durable audit events / outbox"| AUDIT
    BFF1 -.-> MON
    BFF2 -.-> MON
    BFF3 -.-> MON
    CACHE -.-> MON
    DB -.-> MON
    AUDIT -.-> MON

    classDef client fill:#dbeafe,stroke:#2563eb,color:#111827
    classDef app fill:#dcfce7,stroke:#16a34a,color:#111827
    classDef cache fill:#d1fae5,stroke:#059669,color:#111827
    classDef database fill:#dbeafe,stroke:#2563eb,color:#111827
    classDef security fill:#f3e8ff,stroke:#9333ea,color:#111827
    classDef external fill:#ffedd5,stroke:#ea580c,color:#111827

    class Browser,WAF client
    class BFF1,BFF2,BFF3 app
    class R1,R2,R3 cache
    class P1,P2,P3 database
    class TV,KMS security
    class IDP,API,AUDIT,MON external




# Design Document: Resilient Banking Web Authentication and Session Management

**Status:** Proposed — for implementation planning  
**Priority:** High — security-critical  
**Target stack:** Node.js / NestJS or Express, PostgreSQL, Redis  
**Architecture:** Distributed, multi-instance, multi-availability-zone  
**Primary objective:** Secure browser authentication with server-side OAuth token management, durable session control, and no single point of failure within the designed failure domain.

---

## 1. Executive Summary

Implement a Backend for Frontend (BFF) architecture for a banking web application.

The browser must never receive OAuth access tokens or refresh tokens. It receives only an opaque session identifier in a secure cookie. The backend uses this identifier to locate the authenticated session and retrieve the required token material.

The system separates active session caching from durable security state:

- **BFF instances:** Stateless application instances deployed across multiple availability zones.
- **Redis:** Highly available cache for active sessions and other short-lived operational state.
- **PostgreSQL:** Highly available durable store for session lifecycle, revocation state, token metadata, and audit records.
- **Token vault:** Restricted service or module responsible for encrypted refresh-token storage, access-token handling, and token rotation.
- **KMS/HSM:** Managed key protection and cryptographic operations, deployed with an appropriate high-availability and recovery strategy.
- **Identity provider:** Trusted OAuth 2.0 / OpenID Connect provider, or an equivalent internal authentication service.

The design must not depend on a single BFF process, Redis node, database primary, availability zone, or locally stored secret.

A critical security invariant is that **a revoked session must not become usable again because of a cache miss, stale cache entry, failover, or recovery procedure**.

## 2. Goals and Non-Goals

### 2.1 Goals

1. Keep access and refresh tokens out of browser JavaScript.
2. Support multiple BFF instances without sticky sessions.
3. Support high availability across multiple availability zones.
4. Provide durable session revocation and controlled session expiration.
5. Protect refresh tokens at rest and during rotation.
6. Avoid stale caches overriding authoritative security decisions.
7. Survive individual instance, cache-node, database-node, and availability-zone failures.
8. Make failure behavior explicit and testable.
9. Provide security auditability without recording credentials.
10. Support horizontal scaling and rolling deployments.

### 2.2 Non-goals

- Replacing the identity provider.
- Building a custom cryptographic protocol.
- Guaranteeing availability when every replica or the authoritative data service is unavailable.
- Guaranteeing immediate invalidation of independently issued JWTs without a corresponding enforcement mechanism.
- Implementing banking ledger transactions or payment processing in the authentication subsystem.

## 3. Architecture

### 3.1 Logical topology

Browser → Load balancer / WAF → Multiple BFF instances → Redis and PostgreSQL

The BFF communicates with:

- The identity provider for authentication, token refresh, and supported token revocation.
- The token vault for protected token storage and retrieval.
- Downstream banking APIs using authenticated server-to-server requests.
- Centralized audit and monitoring infrastructure.

Redis and PostgreSQL must be deployed using highly available configurations across independent failure domains. A single Redis primary, PostgreSQL primary, or application instance without a failover strategy is not sufficient.

### 3.2 Components and responsibilities

**Browser**

- Holds only an opaque, random session cookie.
- Uses HTTPS exclusively.
- Never stores access or refresh tokens in localStorage, sessionStorage, or JavaScript-accessible persistent storage.
- Never receives raw OAuth tokens from BFF endpoints.

**BFF**

- Handles login callbacks, session creation, session validation, logout, and token refresh.
- Enforces CSRF protection and authorization policies.
- Does not keep session state exclusively in process memory.
- Can be restarted or replaced without losing the authoritative session state.

**Redis**

- Caches active session state and short-lived operational data.
- Uses a highly available, appropriately secured deployment.
- Applies TTLs to temporary state.
- Is not the sole authority for revocation or durable audit history.

**PostgreSQL**

- Stores authoritative session lifecycle records and revocation state.
- Stores encrypted refresh-token material or durable references to the protected token vault.
- Stores token rotation metadata and durable audit events, or integrates with an equivalent durable audit system.
- Uses replicated storage, automated failover, tested backups, and recovery procedures.

**Token vault**

- Restricts token access to authorized backend workloads.
- Encrypts persisted token material.
- Provides concurrency control for refresh-token rotation.
- Prevents multiple BFF instances from independently rotating the same refresh token at the same time.

**KMS/HSM**

- Protects encryption keys and, where appropriate, performs cryptographic operations.
- Keeps key material separate from token ciphertext and application source code.
- Supports key versioning, rotation, access auditing, and disaster recovery.

## 4. Data Placement and Ownership

Each data category must have a clearly defined authoritative owner.

| Data | Authoritative location | Cache policy |
|---|---|---|
| Active session status | PostgreSQL or another durable authoritative session store | Redis may cache non-authoritative state |
| Idle and absolute expiration | Durable session record plus enforced expiration policy | Redis TTL may accelerate cleanup |
| Refresh-token ciphertext | Durable protected token store | Optional restricted cache |
| Access token | Token-management component; encrypted persistence only if required | Short-lived cache if beneficial |
| Revocation state | Durable authoritative record | Cache only if consistency rules preserve revocation |
| Audit events | Durable audit store | Buffering only with reliable delivery guarantees |
| Session rate limits | Distributed rate-limit store | Redis or equivalent |
| Encryption keys | KMS/HSM | Never store plaintext keys in Redis or PostgreSQL |

Do not treat the existence of a Redis key as proof that a session is authorized.

A cache miss must trigger an authoritative lookup. If the authoritative store cannot be reached, protected operations must fail closed.

### 4.1 Session record

The durable session record should include, at minimum:

- Internal session ID.
- User ID.
- Creation timestamp.
- Last activity timestamp, where required.
- Absolute expiration timestamp.
- Revocation timestamp and reason, where applicable.
- Authentication assurance level and authentication timestamp.
- Token vault reference.
- Session version or equivalent concurrency/version metadata.
- Optimistic concurrency version or another mechanism for safe concurrent updates.

Use opaque, unpredictable identifiers. Do not use the session ID itself as the database primary key if doing so would expose the cookie value in database logs or operational tooling. Prefer a cryptographic hash of the cookie's high-entropy identifier for lookup.

## 5. Session Cookie and Browser Security

The browser receives a cookie similar to:

`Set-Cookie: __Host-bank-session=<opaque-random-id>; Path=/; Secure; HttpOnly; SameSite=Lax`

Requirements:

1. HTTPS is mandatory.
2. Use `Secure`, `HttpOnly`, and an appropriate `SameSite` policy.
3. Use the `__Host-` prefix where supported and compatible with the deployment.
4. Do not set a broad cookie `Domain` attribute.
5. Regenerate the session identifier after successful authentication and privilege changes.
6. Clear the cookie on logout.
7. Implement CSRF protection for state-changing requests.
8. Enforce idle and absolute session expiration server-side.
9. Never extend a session beyond the configured absolute expiration.
10. Do not log cookie values or session secrets.

`SameSite` is not a complete substitute for CSRF defenses. Validate request origins where appropriate and implement a suitable CSRF token strategy.

## 6. Login Flow

1. The user starts authentication through the BFF.
2. The BFF redirects to the trusted identity provider using a secure OAuth/OIDC flow.
3. The implementation validates the authentication response, including state, nonce where applicable, issuer, audience, redirect URI, and signature or protocol requirements.
4. The identity provider returns tokens to the designated backend callback.
5. The BFF validates the returned authentication result.
6. The BFF creates a new random session identifier and persists the authoritative session record.
7. Refresh-token material is encrypted and durably saved.
8. The initial session state is published to Redis as a cache entry, if caching is enabled.
9. The BFF sets the session cookie only after the required durable writes succeed.
10. If any required step fails, the BFF does not report a successful login.

The implementation must define compensation and cleanup for partial failures. For example, if token persistence succeeds but session creation fails, the orphaned token must be safely cleaned up or marked unusable.

## 7. Authenticated Request Flow

For every protected request:

1. The BFF extracts the opaque session cookie.
2. It resolves the session using the configured lookup strategy.
3. It verifies authoritative session status and expiration according to the required security consistency policy.
4. It rejects missing, expired, revoked, or otherwise invalid sessions.
5. It enforces the user's authorization for the requested operation.
6. If a downstream API requires an access token, the BFF obtains it from the token-management component.
7. The BFF calls only explicitly configured downstream services.
8. The response is returned without exposing tokens to the browser.

Do not allow arbitrary downstream URLs supplied by the browser. This prevents the BFF from becoming an unintended proxy or introducing server-side request forgery risks.

For sensitive banking operations, session validity alone is insufficient. The application must also verify account ownership, transaction permissions, limits, and required step-up authentication.

## 8. Access-Token Management

Access tokens should have short lifetimes appropriate to the identity provider and risk model.

Requirements:

- Keep access tokens server-side.
- Cache them only when needed to avoid repeated token retrieval.
- Use expiration metadata to avoid sending expired tokens.
- Do not log tokens or include them in URLs.
- Validate issuer, audience, signature, permitted algorithm, and relevant time claims when the BFF or resource server is responsible for validating JWTs.
- Prefer audience-restricted, least-privilege tokens.
- Do not assume a signed JWT is encrypted.
- Define behavior for expired, invalid, revoked, or unavailable tokens.

If an access token is a JWT validated offline by downstream services, invalidating the BFF session alone does not necessarily invalidate that JWT. Its remaining lifetime and any downstream revocation mechanism must be explicitly considered.

## 9. Refresh-Token Management and Rotation

Refresh tokens are long-lived credentials and must receive stronger protection than ordinary cached state.

### 9.1 Storage

Persist refresh-token ciphertext in the protected token store. Keep encryption keys in KMS/HSM or another approved key-management system.

The database must not contain plaintext refresh tokens.

Use authenticated encryption, such as AES-256-GCM, with a managed key hierarchy and appropriate nonce generation. Include contextual authenticated data where appropriate to bind ciphertext to its record and purpose.

Restrict decryption permissions to the backend component that requires token access.

### 9.2 Concurrency control

Multiple BFF instances may process requests for the same session concurrently. They must not independently refresh the same rotating refresh token.

Use a distributed coordination mechanism together with durable version checks or compare-and-swap updates.

A refresh operation should:

1. Acquire the per-session refresh coordination mechanism.
2. Reload the latest authoritative token version.
3. Check whether another instance has already refreshed the token.
4. Call the identity provider only when necessary.
5. Persist the new token set and version safely.
6. Invalidate old cached token material.
7. Release coordination safely.

Do not rely on a distributed lock alone for correctness. Use fencing tokens, version checks, or equivalent protections to prevent stale lock holders from overwriting newer token state.

### 9.3 Ambiguous refresh outcomes

The identity provider may rotate a refresh token successfully while the BFF loses the response or crashes before persisting the replacement.

The implementation must define recovery behavior based on the identity provider's capabilities. If the new token cannot be recovered safely, require reauthentication rather than guessing which token is valid.

Never blindly retry a potentially successful rotating refresh request unless the provider's documented semantics make that safe.

## 10. Logout and Revocation

Logout must revoke the application session even when the identity provider is unavailable.

Required behavior:

1. Persist the session's revoked status using the authoritative store.
2. Prevent subsequent requests from accepting that session.
3. Invalidate Redis entries and cached access-token material.
4. Revoke the refresh token at the identity provider where supported.
5. Record a durable security audit event.
6. Clear the browser cookie.
7. Return an appropriate response without exposing internal errors or credentials.

The application must distinguish between local session invalidation and successful revocation at the identity provider.

If the identity provider is unavailable, local session revocation must still take effect. External token revocation can be retried through a durable work queue.

For an operation that requires immediate revocation, do not acknowledge completion until the authoritative local revocation has been durably committed.

### 10.1 Revocation consistency

A stale Redis cache entry must never override a durable revocation.

For operations requiring immediate enforcement, use one of the following:

- An authoritative session-state check against the durable store.
- A strongly consistent session or revocation service.
- A rigorously designed versioned cache-invalidation mechanism with an authoritative fallback and clearly defined consistency guarantees.

A TTL-only revocation cache is insufficient if the system promises immediate revocation.

If the authoritative revocation state cannot be checked, reject security-sensitive requests rather than accepting potentially revoked sessions.

## 11. Distributed-System and High-Availability Requirements

### 11.1 BFF instances

- Run multiple instances across at least three availability zones where supported.
- Keep application instances stateless with respect to durable session state.
- Use health checks and graceful shutdown.
- Avoid local disk or process memory as the sole store for any required session or token data.
- Use rolling deployments and backward-compatible schema changes.
- Apply timeouts, bounded retries, and circuit breakers to external dependencies.

### 11.2 Redis

- Use a supported highly available Redis deployment with replicas across independent failure domains.
- Enable appropriate authentication, TLS, network restrictions, and monitoring.
- Configure persistence and recovery according to the cache's responsibilities.
- Do not rely on asynchronous replication alone to guarantee that every recent write survives failover.
- Treat Redis as a cache, not as the sole authoritative revocation store.
- Ensure a Redis outage cannot cause the application to bypass session validation.
- Apply backpressure and load shedding during outages to avoid overwhelming PostgreSQL.

### 11.3 PostgreSQL

- Use a supported HA topology with automatic failover and replicas across availability zones.
- Configure synchronous replication or another explicitly approved durability strategy for critical security-state writes.
- Define acceptable recovery point objective (RPO) and recovery time objective (RTO).
- Test split-brain prevention, failover, connection recovery, and replica promotion.
- Ensure the promoted primary cannot silently lose a revocation that the application previously acknowledged.
- Use connection pooling, bounded connection limits, and retry policies that account for ambiguous transaction outcomes.
- Use transactional writes for session creation, revocation, and token-version updates where appropriate.

The implementation must document the actual guarantees of the selected PostgreSQL provider. Merely having a replica does not guarantee zero data loss.

### 11.4 Audit pipeline

- Persist required audit events durably.
- Use a transactional outbox or an equivalent reliable delivery mechanism when audit events must be coupled to database state changes.
- Make consumers idempotent.
- Prevent credentials, access tokens, refresh tokens, and raw session cookies from entering logs.
- Monitor audit pipeline lag and delivery failures.

### 11.5 KMS/HSM

- Use a supported highly available key-management service.
- Separate encryption permissions from general application database permissions.
- Version keys and maintain an approved rotation procedure.
- Define behavior during KMS outages.
- Avoid making every ordinary request dependent on a remote KMS operation when a securely designed envelope-encryption scheme can reduce that dependency.
- Ensure recovery and key availability procedures are tested.

## 12. Failure Behavior

The system must fail securely and predictably.

| Failure | Required behavior |
|---|---|
| BFF instance crashes | Load balancer routes requests to another instance |
| Redis unavailable | Use a controlled authoritative fallback or reject requests; never bypass authentication |
| PostgreSQL primary fails | HA system promotes a suitable replica according to the approved durability policy |
| PostgreSQL unavailable | Reject operations requiring authoritative session decisions |
| Identity provider unavailable | Existing sessions may continue only within established validation and revocation guarantees; new login and refresh may be unavailable |
| KMS unavailable | Use only already available, securely protected key material if policy permits; otherwise fail affected token operations |
| Refresh response lost | Recover only through documented provider semantics; otherwise require reauthentication |
| Audit sink unavailable | Use a durable outbox or approved buffering strategy; never silently discard mandatory audit events |
| Revocation write fails | Do not claim successful revocation; apply the defined security incident and retry behavior |
| Availability zone lost | Remaining zones continue if quorum, capacity, and dependency availability are maintained |
| Cache contains stale active session | Authoritative revocation state takes precedence |
| Network partition | Follow explicit quorum and fail-closed policies; do not create conflicting authorities |

### Important limitation

No distributed system can guarantee both uninterrupted availability and authoritative consistency under every possible network partition and simultaneous failure.

The objective is to eliminate single points of failure within the specified failure domain and make security behavior deterministic when dependencies fail. The system must document which operations remain available during each failure scenario.

## 13. API and Module Boundaries

Suggested logical modules:

- `AuthenticationModule`
- `SessionModule`
- `TokenVaultModule`
- `TokenRefreshModule`
- `RevocationModule`
- `AuthorizationModule`
- `AuditModule`
- `SecurityMonitoringModule`

Suggested BFF endpoints:

- `GET /auth/login`
- `GET /auth/callback`
- `GET /api/session`
- `POST /api/logout`
- `POST /api/transfers` — example of a protected banking operation

Do not expose an endpoint that returns raw access or refresh tokens to the browser.

The implementation must define authentication and authorization requirements for each endpoint, including CSRF requirements, rate limits, and audit events.

## 14. Observability and Incident Response

Collect metrics for:

- Login and authentication failure rates.
- Session creation, expiration, and revocation.
- Redis hit/miss rates and failover events.
- PostgreSQL failover, replication lag, and connection saturation.
- Token refresh success, failure, latency, and ambiguous outcomes.
- Refresh-token reuse detection.
- KMS errors and latency.
- Audit pipeline lag and failed delivery.
- Session validation latency and authoritative-store fallback frequency.

Create alerts for abnormal refresh activity, repeated authentication failures, unusual session creation patterns, revoked-session access attempts, and degraded replication.

Metrics and logs must not expose secrets or sensitive banking information.

## 15. Testing Requirements

Implementation is not complete until the following tests pass:

1. A request can be served by any BFF instance without sticky sessions.
2. Killing a BFF instance does not destroy an active session.
3. A Redis failover does not reactivate a revoked session.
4. A PostgreSQL failover preserves acknowledged critical revocations within the documented durability guarantees.
5. Concurrent refresh requests do not overwrite newer token state.
6. An ambiguous refresh outcome does not trigger unsafe blind retries.
7. Logout invalidates the application session even when the identity provider is unavailable.
8. Expired, revoked, and malformed sessions are rejected.
9. CSRF and session-fixation tests pass.
10. Access and refresh tokens do not appear in browser storage, URLs, logs, or traces.
11. KMS outages produce the documented fail-safe behavior.
12. Audit events survive application-instance restarts and are delivered according to the durability requirements.
13. Loss of one availability zone leaves sufficient healthy capacity to operate within the agreed service objectives.
14. Recovery procedures are tested, including restoring durable data and encryption-key access.
15. Security tests verify that account-level authorization cannot be bypassed by modifying request parameters.

## 16. Acceptance Criteria

The implementation is acceptable when:

- All browser authentication uses the BFF session model.
- No OAuth access or refresh token is exposed to browser JavaScript.
- Session and revocation state have explicitly documented authorities.
- Redis is not the sole authority for critical revocation decisions.
- Refresh-token rotation is concurrency-safe and recoverable according to provider capabilities.
- Critical durable writes have a documented and tested durability guarantee.
- The system survives the loss of any single BFF instance and the designed availability-zone failures.
- There is no undocumented single point of failure in the authentication critical path.
- Recovery, observability, incident response, and security testing are complete.
- All exceptions to fail-closed behavior are explicitly documented and approved.

## 17. Implementation Guidance for Agents

Agents implementing this design must:

1. Inspect the existing repository and deployment architecture before selecting libraries or modifying infrastructure.
2. Reuse the existing identity provider and authentication framework where suitable.
3. Document assumptions about OAuth/OIDC, downstream token validation, database topology, Redis topology, KMS, and deployment regions.
4. Implement the smallest coherent vertical slice first: login, session creation, protected request, refresh, logout, and revocation.
5. Add failure-injection tests before declaring the design highly available.
6. Avoid custom cryptography and unreviewed authentication protocols.
7. Keep infrastructure-specific assumptions configurable.
8. Provide database migrations, operational runbooks, dashboards, alerts, and rollback procedures.
9. Document every residual single point of failure and every scenario in which immediate revocation cannot be guaranteed.
10. Do not claim production readiness until the security and resilience acceptance criteria have been demonstrated.

### Final design decision

Use a **stateless, multi-zone BFF; Redis for active session caching; PostgreSQL or an equivalent durable authoritative store for session lifecycle and revocation; encrypted durable refresh-token storage; and a highly available key-management service**.

Prefer consistency over availability for security-critical authorization and revocation decisions. Use caching and redundancy to preserve performance and availability without allowing stale state to grant access.