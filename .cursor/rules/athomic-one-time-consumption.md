---
name: atomic-one-time-consumption
description: Design, implement, review, and test race-safe one-time operations and single-use credentials. Use for email verification, password reset, OTPs, invitation links, refresh-token rotation, coupon redemption, webhook idempotency, payment commands, inventory claims, and any check-then-act flow where concurrent requests must not both succeed.
---

# Atomic One-Time Consumption

## Goal

Guarantee that an operation intended to happen once cannot be successfully claimed or applied more than once under concurrent requests, retries, process crashes, or duplicate delivery.

Do not assume application-level checks provide this guarantee. The database or the downstream system that owns the state transition must enforce it atomically.

## When to use this skill

Apply this skill whenever code:
- validates a token/code/invitation and then marks it used;
- checks a status such as `pending`, `unused`, `unclaimed`, or `unpaid` before changing it;
- handles retries or duplicate webhook/message delivery;
- redeems a coupon, claims a resource, consumes a quota, rotates a refresh token, or performs a payment-like action;
- reads a row and later writes based on the earlier read;
- promises “exactly once,” “only once,” “single use,” or idempotent behavior.

Search relevant handlers, services, repositories, Prisma models, migrations, background jobs, and tests before changing code. Follow the project's existing conventions and database/provider capabilities.

## Core rule: no check-then-act race

Unsafe pattern:

1. Read a row.
2. Check `usedAt == null` (or status is pending).
3. Perform the operation.
4. Update the row to mark it consumed.

Two concurrent requests can both pass step 2 before either reaches step 4.

Prefer a single conditional database write whose predicate includes every condition required to claim the row. Treat the affected-row count as the claim result.

## Prisma + PostgreSQL pattern

For a single-use token, use a conditional `updateMany` (or parameterized SQL with equivalent semantics) that checks identity, unconsumed state, and expiry while marking it consumed:

```ts
const now = new Date();

const claim = await tx.emailVerificationToken.updateMany({
  where: {
    tokenHash,
    usedAt: null,
    expiresAt: { gt: now },
  },
  data: { usedAt: now },
});

if (claim.count !== 1) {
  // Invalid, expired, already consumed, revoked, or otherwise not claimable.
  throw new InvalidOrConsumedTokenError();
}
```

The example assumes `tokenHash` uniquely identifies one row. Keep the operation inside a transaction when it must be coupled to other database changes.

For email verification, for example:

```ts
await prisma.$transaction(async (tx) => {
  const now = new Date();

  const claim = await tx.emailVerificationToken.updateMany({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
      user: { emailVerifiedAt: null },
    },
    data: { usedAt: now },
  });

  if (claim.count !== 1) {
    throw new InvalidOrConsumedTokenError();
  }

  await tx.user.updateMany({
    where: {
      id: userId, // Use the user ID belonging to the claimed token.
      emailVerifiedAt: null,
    },
    data: { emailVerifiedAt: now },
  });
});
```

Adapt this example to the project's actual Prisma schema and Prisma version. Do not blindly copy relation filters or `userId` handling: derive the user identity from the matched token, and ensure the user update affects exactly the intended row. If the user update unexpectedly affects zero rows, throw so the transaction rolls back. A robust implementation may claim the token by unique hash, inspect the claimed row in a transaction, or use a carefully parameterized SQL statement/locking strategy to bind the token and user without trusting caller-supplied identity.

Important:
- A conditional update's `count === 1` means this request won the claim; `count === 0` means it did not.
- Include expiry/revocation/state predicates in the claim itself, not only in an earlier read.
- Keep the claim and dependent database mutations in the same transaction. A later failure must roll back the claim.
- Do not catch and suppress errors inside the transaction if doing so would cause it to commit partial work.
- A transaction alone does not fix a check-then-act race if the isolation/locking strategy still allows both requests to pass the check. Use an atomic conditional write, appropriate row lock, serializable isolation with retry handling, or a database constraint that enforces the invariant.
- Do not use `findUnique` followed by an unconditional `update` as the only single-use protection.

## Choose the correct invariant for the use case

Do not force every case into a `usedAt` column. Identify the resource and invariant first.

### Single-use credentials
Examples: email verification, password reset, magic login links, invitation acceptance, OTP challenges.

- Claim/consume with a conditional state transition.
- Check expiry, revocation, attempt limits, and intended subject as part of the transition.
- Hash high-entropy bearer tokens at rest; never log raw tokens.
- Make token issuance/resend policy explicit (e.g. revoke prior active tokens).
- Ensure the associated account mutation commits in the same transaction.
- For OTPs, account for low entropy: rate-limit attempts and use an appropriate keyed/slow verification strategy according to the threat model; do not assume plain SHA-256 makes a short code safe against database leaks.

### Idempotency keys and duplicate webhooks
Examples: payment-provider webhooks, API idempotency keys, queue redelivery.

- Add a database uniqueness constraint for the provider/event ID or scoped idempotency key.
- Attempt to insert/claim the idempotency record atomically; handle unique-conflict outcomes as duplicates.
- Persist the business result and idempotency outcome transactionally when they share a database.
- Verify webhook signatures and provider identity before trusting event identifiers.
- Do not assume a database transaction makes an external API call exactly-once. Use provider idempotency keys, durable state machines, an outbox/inbox pattern, and reconciliation where appropriate.
- Define what a duplicate request receives: stored prior response, accepted/no-op, or a documented conflict.

### Counters, quotas, inventory, and limited claims
Examples: coupon limits, seat allocation, remaining credits.

- Use a conditional decrement/update (`remaining > 0`) and check affected-row count, or enforce the invariant with a suitable constraint/locking strategy.
- Do not read a counter into application memory and then write the computed value without concurrency protection.
- Add unique constraints for “one claim per user/resource” invariants where appropriate.

### State transitions
Examples: pending -> approved, draft -> published, unpaid -> paid.

- Update with both the record ID and expected prior state in the predicate.
- Treat zero affected rows as a lost race or invalid transition.
- Use a transaction for related local database changes.
- Consider optimistic concurrency/version columns for broader editing workflows.

### Refresh-token rotation
- Atomically mark the old token/session as consumed or revoked while issuing the replacement.
- Detect reuse of a rotated token if the security model requires family revocation.
- Do not return a new credential unless the transaction commits.

## External side effects

Email sending, payment-provider calls, webhooks, and message publishing cannot generally be made atomic with a local SQL transaction.

Do not claim “exactly once” just because a database transaction is used. Prefer:
- durable intent/outbox rows committed with local state;
- a worker that retries delivery;
- stable provider idempotency keys where supported;
- deduplication/inbox records for incoming events;
- explicit retry and reconciliation behavior.

Do not hold database locks open across slow network calls unless the architecture has a justified, carefully bounded reason.

## Schema and migration review

Inspect whether the invariant belongs in the schema:
- `UNIQUE` constraints for idempotency keys, provider event IDs, one claim per user/resource, or unique token hashes;
- indexes supporting actual lookup/cleanup paths;
- foreign keys and delete behavior;
- state/version columns only when needed;
- check constraints for valid row-level relationships where practical.

Do not add indexes or schema fields speculatively. A time-based cleanup index is useful only if the application runs cleanup queries that benefit from it. Expired records must still be rejected at use time regardless of cleanup.

## Required implementation workflow

1. State the invariant in one sentence (e.g. “at most one request can consume this token”).
2. Identify the authoritative database row or unique key that owns the invariant.
3. Find every path that can perform the operation: HTTP handlers, jobs, retries, admin actions, and tests.
4. Replace check-then-act logic with an atomic conditional write, uniqueness constraint, lock, or other justified database-enforced mechanism.
5. Put dependent database changes in one transaction.
6. Handle zero-row claims and uniqueness conflicts as normal control flow, without leaking sensitive token/account information.
7. For external side effects, design idempotency/outbox/reconciliation rather than pretending the SQL transaction covers them.
8. Add tests that force concurrent attempts, not only sequential repeated requests.
9. Run the relevant tests, type checks, lint, and migrations/schema validation available in the repository.
10. Summarize the invariant, implementation, concurrency behavior, tests run, and any remaining limitations.

## Required tests

At minimum, test:
- first valid attempt succeeds;
- sequential reuse fails or returns the documented idempotent response;
- expired/revoked/invalid tokens fail;
- two or more concurrent attempts against the same credential result in at most one successful consumption;
- if a dependent database update fails, token consumption rolls back;
- duplicate webhook/event/idempotency-key deliveries do not duplicate the business effect;
- independent tokens/resources can still be processed concurrently.

For concurrency tests, issue multiple requests/promises at the same time against a real test database or a sufficiently faithful integration environment. Do not consider a mocked repository test proof of database race safety.

Assert business effects and persisted state, not only HTTP status codes. Ensure tests clean up their records and do not rely on timing sleeps as the sole synchronization mechanism.

## Review checklist

Before declaring the work complete, verify:
- [ ] No security-sensitive check-then-act sequence is the sole protection.
- [ ] The database claim predicate includes current state and expiry/revocation conditions.
- [ ] Affected-row counts or unique-constraint outcomes determine the winner.
- [ ] Related database writes are transactional and failures roll back.
- [ ] Identity comes from trusted persisted state, not an untrusted caller-supplied user ID.
- [ ] Retries and duplicate delivery have defined behavior.
- [ ] External side effects have a realistic idempotency/retry strategy.
- [ ] Concurrency tests prove at-most-once behavior.
- [ ] Errors and logs do not expose raw tokens, secrets, or unnecessary account-existence details.
- [ ] Claims about “exactly once” are limited to what the system can actually guarantee.

## Output expected from the agent

When applying this skill, report:
1. The invariant being protected.
2. The unsafe code path(s) found.
3. The chosen atomicity mechanism and why it is correct for this database.
4. The files changed.
5. Tests executed and their results.
6. Any residual race, external-side-effect, or deployment limitation.

Do not merely recommend a fix: inspect the repository, implement it where authorized, and test it. If key context is missing or the safe behavior is ambiguous, ask a focused question rather than inventing a policy.
