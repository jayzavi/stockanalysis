import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
// Must include openid email profile so NextAuth gets user info; add Drive on top
const GOOGLE_SCOPE = `openid email profile ${GOOGLE_DRIVE_SCOPE}`;

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: GOOGLE_SCOPE,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      try {
        if (account?.access_token) {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token ?? null;
          token.expiresAt = account.expires_at ?? null;
        }
        const p = profile as { email?: string; name?: string; picture?: string } | undefined;
        if (p?.email) {
          token.email = p.email;
          token.name = p.name;
          token.picture = p.picture;
        }
      } catch {
        // avoid throwing and causing OAuthCallback error
      }
      return token;
    },
    async session({ session, token }) {
      try {
        if (session.user) {
          session.user.email = (token.email as string) ?? session.user.email;
          session.user.name = (token.name as string) ?? session.user.name;
          session.user.image = (token.picture as string) ?? session.user.image;
        }
        (session as { accessToken?: string; refreshToken?: string | null }).accessToken = token.accessToken as string | undefined;
        (session as { refreshToken?: string | null }).refreshToken = token.refreshToken as string | null | undefined;
      } catch {
        // avoid throwing
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
