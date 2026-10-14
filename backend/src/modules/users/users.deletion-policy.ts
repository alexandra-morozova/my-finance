/**
 * User hard-delete is not part of the public API.
 *
 * Postgres RESTRICTs on Account/Transaction → User (see transaction-design.md §6.4).
 * Do not add repository helpers that call prisma.user.delete() until an approved
 * GDPR / retention workflow exists.
 */
export const USER_HARD_DELETE_DISABLED = true as const;
