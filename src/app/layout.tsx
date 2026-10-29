import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MobileTabBar } from "@/components/layout/mobile-tabbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: {
    default: "Bookart — Buy, rent & sell books, notes and study material nearby",
    template: "%s · Bookart",
  },
  description:
    "Bookart is a hyperlocal marketplace for books, handwritten notes and study material. Buy from a bookshop down the road, rent with a refundable security deposit, or list what you've finished.",
  keywords: [
    "second hand books",
    "rent books",
    "handwritten notes",
    "UPSC material",
    "JEE NEET books",
    "college notes",
    "local bookstore",
  ],
  applicationName: "Bookart",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="min-h-screen">
        <SiteHeader user={user} />
        <main className="min-h-[60vh]">{children}</main>
        <SiteFooter />
        <MobileTabBar />
      </body>
    </html>
  );
}
