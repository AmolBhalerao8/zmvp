import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { UserRole } from "@prisma/client";

export async function requireSession(allowedRoles?: UserRole[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(session.user.role)) redirect("/");
  return session;
}

export async function requireStaff() {
  return requireSession(["OWNER", "MANAGER", "TECHNICIAN"]);
}

export async function requireManager() {
  return requireSession(["OWNER", "MANAGER"]);
}
