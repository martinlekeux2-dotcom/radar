"use client";

import { usePathname } from "next/navigation";
import SiteFooter from "./site-footer";
import SiteHeader from "./site-header";

export default function SiteShell({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdmin) return children;

  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
