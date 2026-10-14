import type { Account } from "./accounts.types.ts";

/** Public account shape only — sync/provider fields stay in the repository layer. */
export function toAccountResponse(account: Account) {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}
