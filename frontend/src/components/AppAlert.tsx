import { Alert } from "antd";
import "./app-alert.scss";

type AppAlertProps = {
  type: "success" | "info" | "warning" | "error";
  message: string;
  className?: string;
};

export function AppAlert({ type, message, className }: AppAlertProps) {
  return (
    <Alert
      type={type}
      showIcon
      message={message}
      className={className ? `app-alert ${className}` : "app-alert"}
    />
  );
}
