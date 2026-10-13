import { Card, Descriptions } from "antd";
import { useAuthenticatedUser } from "@/contexts/auth.tsx";
import "./home-page.scss";

export function HomePage() {
  const user = useAuthenticatedUser();

  return (
    <div className="home-page">
      <Card title={`Welcome, ${user.name}`}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Name">{user.name}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
