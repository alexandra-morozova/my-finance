import { Button, Form } from "antd";
import { useCallback } from "react";
import { Link, useLocation } from "react-router";
import { AppAlert } from "@/components/AppAlert.tsx";
import {
  AuthEmailField,
  AuthPasswordField,
} from "@/components/auth/AuthFormFields.tsx";
import { useAuthActions, useAuthSessionError } from "@/contexts/auth.tsx";
import { useFormSubmit } from "@/hooks/useFormSubmit.ts";
import { AuthLayout } from "@/layouts/AuthLayout.tsx";
import { routes } from "@/routes.ts";
import { normalizeAuthEmail } from "@/utils/authFormRules.ts";
import { getRouteNotice } from "@/utils/navigation.ts";

type LoginFields = {
  email: string;
  password: string;
};

export function LoginPage() {
  const sessionError = useAuthSessionError();
  const { login } = useAuthActions();
  const location = useLocation();
  const notice = getRouteNotice(location.state);
  const submitLogin = useCallback(
    async (values: LoginFields) => {
      await login({
        email: normalizeAuthEmail(values.email),
        password: values.password,
      });
    },
    [login],
  );
  const { error, submitting, onFinish } = useFormSubmit(
    submitLogin,
    "Unable to sign in",
  );

  return (
    <AuthLayout
      title="Sign in"
      footer={
        <>
          Need an account? <Link to={routes.register}>Register</Link>
        </>
      }
    >
      {notice ? <AppAlert type="success" message={notice} /> : null}
      {sessionError ? (
        <AppAlert type="warning" message={sessionError} />
      ) : null}
      {error ? <AppAlert type="error" message={error} /> : null}
      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <AuthEmailField />
        <AuthPasswordField autoComplete="current-password" />
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            Sign in
          </Button>
        </Form.Item>
      </Form>
    </AuthLayout>
  );
}
