import type { Metadata } from "next";

export const metadata: Metadata = { title: "棉花俱乐部 · 单量排行榜" };

export default function LeaderboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
