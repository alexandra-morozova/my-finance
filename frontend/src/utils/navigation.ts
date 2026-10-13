import { routes } from "@/routes.ts";

function isInternalPath(pathname: string): boolean {
  return pathname.startsWith("/") && !pathname.startsWith("//");
}

export function getRouteNotice(state: unknown): string | null {
  if (
    state &&
    typeof state === "object" &&
    "notice" in state &&
    typeof state.notice === "string"
  ) {
    return state.notice;
  }
  return null;
}

export function getPostLoginPath(state: unknown): string {
  if (!state || typeof state !== "object" || !("from" in state)) {
    return routes.home;
  }

  const from = state.from;
  if (!from || typeof from !== "object" || !("pathname" in from)) {
    return routes.home;
  }

  const pathname = from.pathname;
  if (typeof pathname !== "string" || !isInternalPath(pathname)) {
    return routes.home;
  }

  if (pathname === routes.login || pathname === routes.register) {
    return routes.home;
  }

  const search =
    "search" in from && typeof from.search === "string" ? from.search : "";
  const hash = "hash" in from && typeof from.hash === "string" ? from.hash : "";
  return `${pathname}${search}${hash}`;
}
