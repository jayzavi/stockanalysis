import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: GOOGLE_DRIVE_SCOPE,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token ?? null;
        token.expiresAt = account.expires_at ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      (session as { accessToken?: string; refreshToken?: string | null }).accessToken = token.accessToken as string | undefined;
      (session as { refreshToken?: string | null }).refreshToken = token.refreshToken as string | null | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
