import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Jay Money Insights | Stock Research Engine",
  description: "Multi-agent executive research memos for hedge fund research.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
