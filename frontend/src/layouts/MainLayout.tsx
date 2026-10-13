import { Button, Layout, Typography } from "antd";
import { Outlet } from "react-router";
import { AppAlert } from "@/components/AppAlert.tsx";
import { useAuthActions, useAuthenticatedUser } from "@/contexts/auth.tsx";
import { useAsyncAction } from "@/hooks/useAsyncAction.ts";
import "./main-layout.scss";

export function MainLayout() {
  const user = useAuthenticatedUser();
  const { logout } = useAuthActions();
  const {
    error: signOutError,
    pending: signingOut,
    run: runSignOut,
  } = useAsyncAction("Unable to sign out");

  return (
    <Layout className="main-layout">
      <Layout.Header className="main-layout__header">
        <Typography.Text strong className="main-layout__brand">
          MyFinance
        </Typography.Text>
        <div className="main-layout__header-actions">
          <Typography.Text className="main-layout__user-email">
            {user.email}
          </Typography.Text>
          <Button
            onClick={() => void runSignOut(() => logout())}
            loading={signingOut}
          >
            Sign out
          </Button>
        </div>
      </Layout.Header>
      <Layout.Content className="main-layout__content">
        {signOutError ? (
          <AppAlert type="error" message={signOutError} />
        ) : null}
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
