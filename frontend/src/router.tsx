import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router";
import { GuestRoute, ProtectedRoute } from "@/components/routing/ProtectedRoute.tsx";
import { RouteSpinner } from "@/components/routing/RouteSpinner.tsx";
import { MainLayout } from "@/layouts/MainLayout.tsx";
import { NotFoundPage } from "@/pages/NotFoundPage.tsx";
import { routes } from "@/routes.ts";

const HomePage = lazy(async () => {
  const module = await import("@/pages/HomePage.tsx");
  return { default: module.HomePage };
});

const LoginPage = lazy(async () => {
  const module = await import("@/pages/LoginPage.tsx");
  return { default: module.LoginPage };
});

const RegisterPage = lazy(async () => {
  const module = await import("@/pages/RegisterPage.tsx");
  return { default: module.RegisterPage };
});

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteSpinner />}>{children}</Suspense>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route
            path={routes.home}
            element={
              <LazyPage>
                <HomePage />
              </LazyPage>
            }
          />
        </Route>
      </Route>
      <Route element={<GuestRoute />}>
        <Route
          path={routes.login}
          element={
            <LazyPage>
              <LoginPage />
            </LazyPage>
          }
        />
        <Route
          path={routes.register}
          element={
            <LazyPage>
              <RegisterPage />
            </LazyPage>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
