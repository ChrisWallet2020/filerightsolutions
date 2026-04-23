"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { config } from "@/lib/config";

type HeaderProps = {
  signedIn?: boolean;
};

function normalizePathname(p: string | null): string {
  if (!p) return "";
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

export function Header({ signedIn = false }: HeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const hideRegisterOnAccount = pathname?.startsWith("/account") ?? false;
  const path = normalizePathname(pathname);
  const showMyAccount = signedIn && !path.startsWith("/account");

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
    } finally {
      window.location.assign("/login");
    }
  }, []);

  const NavLinks = () => (
    <>
      <Link href="/services">Services</Link>
      <Link href="/how-it-works">How It Works</Link>
      <Link href="/pricing">Pricing</Link>
      <Link href="/faqs">FAQs</Link>
      <Link href="/about">About</Link>
      <Link href="/contact">Contact</Link>
    </>
  );

  return (
    <header className="header">
      <div className="headerInner">
        <Link href="/" className="brand">
          <span className="brandMark">▦</span>
          <span className="brandName">{config.siteName}</span>
        </Link>

        <nav className="navDesktop">
          <NavLinks />
        </nav>

        <div className="navRight">
          {showMyAccount && (
            <Link href="/account" className="hideMobile btn btnSecondary navRightAction">
              My Account
            </Link>
          )}
          {!signedIn && !hideRegisterOnAccount && (
            <Link href="/register" className="hideMobile btn btnSecondary">
              Register
            </Link>
          )}
          {signedIn ? (
            <Button
              type="button"
              variant="secondary"
              className="hideMobile navRightAction"
              loading={signingOut}
              onClick={() => void signOut()}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          ) : (
            <Link href="/login" className="hideMobile btnHeaderCta">
              Sign In
            </Link>
          )}
          <button type="button" className="hamburger" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            ☰
          </button>
        </div>
      </div>

      {open && (
        <div className="navMobile">
          <NavLinks />
          {showMyAccount && (
            <Link
              href="/account"
              className="wFull btn btnSecondary navRightAction"
              onClick={() => setOpen(false)}
            >
              My Account
            </Link>
          )}
          {signedIn ? (
            <Button
              type="button"
              className="wFull navRightAction"
              variant="secondary"
              loading={signingOut}
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          ) : (
            <Link href="/pricing" className="wFull btn" onClick={() => setOpen(false)}>
              Get Started
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
