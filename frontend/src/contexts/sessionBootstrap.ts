import { ApiError } from "@/services/api.ts";
import { getCurrentUser } from "@/services/users.ts";
import type { User } from "@/types/user.ts";
import { getRequestErrorMessage } from "@/utils/errors.ts";

export const SESSION_CHECK_FAILED =
  "Unable to verify your session. Try signing in again.";

export type SessionBootstrapResult = {
  user: User | null;
  sessionError: string | null;
};

export async function bootstrapSession(): Promise<SessionBootstrapResult> {
  try {
    const user = await getCurrentUser();
    return { user, sessionError: null };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { user: null, sessionError: null };
    }

    console.error(error);
    return {
      user: null,
      sessionError: getRequestErrorMessage(error, SESSION_CHECK_FAILED),
    };
  }
}
