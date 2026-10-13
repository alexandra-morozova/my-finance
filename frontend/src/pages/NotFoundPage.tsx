import { Button, Result } from "antd";
import { Link } from "react-router";
import { RouteSpinner } from "@/components/routing/RouteSpinner.tsx";
import { useAuthReady, useAuthUser } from "@/contexts/auth.tsx";
import { routes } from "@/routes.ts";
import "./not-found-page.scss";

export function NotFoundPage() {
  const ready = useAuthReady();
  const user = useAuthUser();

  if (!ready) {
    return <RouteSpinner />;
  }

  return (
    <div className="not-found-page">
      <Result
        status="404"
        title="Page not found"
        subTitle="The page you requested does not exist."
        extra={
          <Link to={user ? routes.home : routes.login}>
            <Button type="primary">{user ? "Go home" : "Sign in"}</Button>
          </Link>
        }
      />
    </div>
  );
}
