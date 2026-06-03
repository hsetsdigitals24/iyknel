import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const isAdminPath = req.nextUrl.pathname.startsWith("/admin");
    if (isAdminPath && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  },
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/cart/:path*", "/wishlist/:path*", "/checkout/:path*", "/orders/:path*", "/account/:path*"],
};
