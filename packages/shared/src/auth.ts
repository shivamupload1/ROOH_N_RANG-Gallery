export type AppRole = "ADMIN" | "CLIENT" | "GUEST";

export type AuthIdentity = {
  id: string;
  email: string;
  role: AppRole;
};
