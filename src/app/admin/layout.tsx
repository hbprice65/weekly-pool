import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Tools - NFL Weekly Pool",
  description: "Administrative tools for managing pool members and emergency pick overrides",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
