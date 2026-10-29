import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/erp/theme-provider";

export const metadata: Metadata = {
  title: "CE Logistic Panel — Dockyard ERP",
  description:
    "Advanced ERP system for dockyard operations, procurement, inventory, and project vote allocations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground min-h-screen"
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
