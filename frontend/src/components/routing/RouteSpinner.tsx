import { Spin } from "antd";
import "./route-spinner.scss";

export function RouteSpinner() {
  return (
    <div className="route-spinner">
      <Spin size="large" />
    </div>
  );
}
