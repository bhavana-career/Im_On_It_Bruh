import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'OTP Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        otp: { label: 'OTP Code', type: 'text' },
        name: { label: 'Name', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) return null;
        
        try {
          // Post to backend verify route
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL!}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              code: credentials.otp,
              name: credentials.name,
            }),
          });
          
          if (!response.ok) return null;
          const data = await response.json();
          
          if (data && data.user) {
            return {
              id: data.user._id,
              name: data.user.profileName,
              email: data.user.email,
              image: data.user.avatarUrl,
              token: data.token, // Store JWT token for API authorization
            };
          }
        } catch (error) {
          console.error('[NextAuth] Authorize OTP error:', error);
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.accessToken = (user as any).token;
      }
      
      // If logging in via Google OAuth, fetch/register with the backend
      if (account && account.provider === 'google') {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL!}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              googleId: account.providerAccountId,
              email: token.email,
              name: token.name,
              avatarUrl: token.picture,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            token.id = data.user._id;
            token.accessToken = data.token;
          }
        } catch (error) {
          console.error('[NextAuth] Google login sync with backend failed:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session as any).user.id = token.id;
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth',
  },
  secret: process.env.NEXTAUTH_SECRET!,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
