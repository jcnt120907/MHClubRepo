import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "棉花俱乐部 · 订单管理",
  description: "陪玩、语聊与礼物订单管理",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
