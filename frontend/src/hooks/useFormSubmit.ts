import { useCallback } from "react";
import { useAsyncAction } from "./useAsyncAction.ts";

export function useFormSubmit<T>(
  submit: (values: T) => Promise<void>,
  fallbackMessage: string,
) {
  const { error, pending, run } = useAsyncAction(fallbackMessage);

  const onFinish = useCallback(
    (values: T) => {
      void run(() => submit(values));
    },
    [run, submit],
  );

  return { error, submitting: pending, onFinish };
}
