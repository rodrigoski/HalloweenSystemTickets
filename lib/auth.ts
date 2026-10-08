import type { User } from "@supabase/supabase-js"

export type Role = "admin" | "vendedor"

export function getRole(user: User | null | undefined): Role {
  const role = user?.app_metadata?.role
  return role === "admin" ? "admin" : "vendedor"
}

export function isAdmin(user: User | null | undefined): boolean {
  return getRole(user) === "admin"
}
