import type { ReactNode } from "react";
import { useAuthReady } from "@/contexts/auth.tsx";
import { RouteSpinner } from "./RouteSpinner.tsx";

type WaitForAuthReadyProps = {
  children: ReactNode;
};

export function WaitForAuthReady({ children }: WaitForAuthReadyProps) {
  const ready = useAuthReady();
  if (!ready) {
    return <RouteSpinner />;
  }
  return children;
}
