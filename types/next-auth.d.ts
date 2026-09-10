import type { DefaultSession } from "next-auth";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: UserRole;
    shopId: string;
    customerId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      shopId: string;
      customerId?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    shopId: string;
    customerId?: string | null;
  }
}
