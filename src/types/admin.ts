export type AdminRole = "ADMIN" | "SUPER_ADMIN";

export type AdminPrincipal = {
  id: string;
  email: string;
  role: AdminRole;
};
