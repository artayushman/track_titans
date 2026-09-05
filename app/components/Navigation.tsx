"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    {
      name: "Control Room",
      href: "/",
    },
    {
      name: "Passenger",
      href: "/passenger",
    },
    {
      name: "Controller",
      href: "/controller",
    },
  ];

  return (
    <nav
      style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
        padding: "8px",
        background: "#0b0b0b",
        border: "1px solid #242424",
        borderRadius: "12px",
        width: "fit-content",
      }}
    >
      {links.map((link) => {
        const active = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              textDecoration: "none",
              color: active ? "#050505" : "#aaa",
              background: active ? "#f5f5f5" : "transparent",
              padding: "9px 14px",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: 800,
              transition: "all 0.2s ease",
            }}
          >
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}