import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScreenReverse - 内容逆向分析工具",
  description: "输入链接，自动拆解内容结构，生成可复用的 Prompt 套餐",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
