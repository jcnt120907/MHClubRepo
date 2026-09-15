import type { Metadata } from "next";
export const metadata: Metadata = { title: "棉花俱乐部 · 陪陪管理" };
export default function CompanionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
