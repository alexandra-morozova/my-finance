import { Button, Form } from "antd";
import { useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { AppAlert } from "@/components/AppAlert.tsx";
import {
  AuthEmailField,
  AuthNameField,
  AuthPasswordField,
} from "@/components/auth/AuthFormFields.tsx";
import { useAuthActions } from "@/contexts/auth.tsx";
import { useFormSubmit } from "@/hooks/useFormSubmit.ts";
import { AuthLayout } from "@/layouts/AuthLayout.tsx";
import { routes } from "@/routes.ts";
import {
  normalizeAuthEmail,
  normalizeAuthName,
} from "@/utils/authFormRules.ts";

type RegisterFields = {
  name: string;
  email: string;
  password: string;
};

export function RegisterPage() {
  const { register } = useAuthActions();
  const navigate = useNavigate();
  const submitRegister = useCallback(
    async (values: RegisterFields) => {
      const message = await register({
        name: normalizeAuthName(values.name),
        email: normalizeAuthEmail(values.email),
        password: values.password,
      });
      void navigate(routes.login, { replace: true, state: { notice: message } });
    },
    [navigate, register],
  );
  const { error, submitting, onFinish } = useFormSubmit(
    submitRegister,
    "Unable to create an account",
  );

  return (
    <AuthLayout
      title="Create an account"
      footer={
        <>
          Already have an account? <Link to={routes.login}>Sign in</Link>
        </>
      }
    >
      {error ? <AppAlert type="error" message={error} /> : null}
      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <AuthNameField />
        <AuthEmailField />
        <AuthPasswordField autoComplete="new-password" />
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            Register
          </Button>
        </Form.Item>
      </Form>
    </AuthLayout>
  );
}
