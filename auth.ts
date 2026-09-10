import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          select: {
            id: true,
            shopId: true,
            customerId: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
            isActive: true,
          },
        });
        if (!user?.isActive || !(await compare(parsed.data.password, user.passwordHash))) {
          return null;
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          shopId: user.shopId,
          customerId: user.customerId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.shopId = user.shopId;
        token.customerId = user.customerId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as UserRole;
        session.user.shopId = token.shopId as string;
        session.user.customerId = token.customerId as string | null | undefined;
      }
      return session;
    },
    authorized({ auth: session, request }) {
      const pathname = request.nextUrl.pathname;
      const publicPath =
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/portal/") ||
        pathname.startsWith("/receptionist");
      return publicPath || Boolean(session?.user);
    },
  },
});
