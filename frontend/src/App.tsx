import { ConfigProvider } from "antd";
import { BrowserRouter } from "react-router";
import { ErrorBoundary } from "@/components/ErrorBoundary.tsx";
import { AuthProvider } from "@/contexts/auth.tsx";
import { AppRouter } from "@/router.tsx";
import { theme } from "@/styles/theme.ts";

export function App() {
  return (
    <ConfigProvider theme={theme}>
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <AppRouter />
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </ConfigProvider>
  );
}
