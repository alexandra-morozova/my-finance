export const apiPaths = {
  authLogin: "/auth/login",
  authRegister: "/auth/register",
  /** Reserved for POST /auth/logout when the backend route exists. */
  authLogout: "/auth/logout",
  usersMe: "/users/me",
} as const;
