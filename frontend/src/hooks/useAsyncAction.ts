import { useCallback, useState } from "react";
import { getRequestErrorMessage } from "@/utils/errors.ts";

export function useAsyncAction(fallbackMessage: string) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setError(null);
      setPending(true);
      try {
        await action();
      } catch (err) {
        setError(getRequestErrorMessage(err, fallbackMessage));
      } finally {
        setPending(false);
      }
    },
    [fallbackMessage],
  );

  return { error, pending, run };
}
