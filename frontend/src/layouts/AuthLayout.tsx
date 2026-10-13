import { Typography } from "antd";
import type { ReactNode } from "react";
import "./auth-layout.scss";

type AuthLayoutProps = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ title, children, footer }: AuthLayoutProps) {
  return (
    <div className="auth-layout">
      <div className="auth-layout__card">
        <Typography.Title level={3}>{title}</Typography.Title>
        {children}
        {footer ? (
          <Typography.Paragraph className="auth-layout__footer">
            {footer}
          </Typography.Paragraph>
        ) : null}
      </div>
    </div>
  );
}
