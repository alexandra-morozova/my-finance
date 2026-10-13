import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthUser } from "@/contexts/auth.tsx";
import { routes } from "@/routes.ts";
import { getPostLoginPath } from "@/utils/navigation.ts";
import { WaitForAuthReady } from "./WaitForAuthReady.tsx";

function ProtectedRouteWhenReady() {
  const user = useAuthUser();
  const location = useLocation();
  if (!user) {
    return (
      <Navigate to={routes.login} replace state={{ from: location }} />
    );
  }
  return <Outlet />;
}

export function ProtectedRoute() {
  return (
    <WaitForAuthReady>
      <ProtectedRouteWhenReady />
    </WaitForAuthReady>
  );
}

function GuestRouteWhenReady() {
  const user = useAuthUser();
  const location = useLocation();
  if (user) {
    return (
      <Navigate to={getPostLoginPath(location.state)} replace />
    );
  }
  return <Outlet />;
}

export function GuestRoute() {
  return (
    <WaitForAuthReady>
      <GuestRouteWhenReady />
    </WaitForAuthReady>
  );
}
