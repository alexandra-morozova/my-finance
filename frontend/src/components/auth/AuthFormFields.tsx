import { Form, Input } from "antd";
import {
  emailFieldRules,
  nameFieldRules,
  passwordFieldRules,
} from "@/utils/authFormRules.ts";

type AuthPasswordFieldProps = {
  autoComplete: "current-password" | "new-password";
};

export function AuthNameField() {
  return (
    <Form.Item label="Name" name="name" rules={nameFieldRules}>
      <Input autoComplete="name" />
    </Form.Item>
  );
}

export function AuthEmailField() {
  return (
    <Form.Item label="Email" name="email" rules={emailFieldRules}>
      <Input autoComplete="email" />
    </Form.Item>
  );
}

export function AuthPasswordField({ autoComplete }: AuthPasswordFieldProps) {
  return (
    <Form.Item label="Password" name="password" rules={passwordFieldRules}>
      <Input.Password autoComplete={autoComplete} />
    </Form.Item>
  );
}
