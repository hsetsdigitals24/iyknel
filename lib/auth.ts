import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  // PrismaAdapter ships @auth/core types; next-auth v4 expects its own.
  // The shape is compatible at runtime — cast once at the boundary.
  adapter: PrismaAdapter(db) as Adapter,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
        const user = await db.user.findUnique({ where: { email: creds.email } });
        if (!user?.passwordHash) return null;
        const ok = await compare(creds.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as { id: string }).id;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.uid as string;
        (session.user as { role?: Role }).role = token.role as Role;
      }
      return session;
    },
  },
};
