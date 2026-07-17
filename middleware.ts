import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccess, isAdminRole, sectionForPath } from "@/lib/permissions";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const { pathname } = req.nextUrl;
    if (pathname.startsWith("/admin")) {
      if (!isAdminRole(role)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      if (!canAccess(role, sectionForPath(pathname))) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
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
