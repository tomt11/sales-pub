import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/modules/dojo/components/Nav";

export const metadata: Metadata = {
  title: "Origination Dojo",
  description: "Sales & relationship mastery training for agri-finance origination",
  appleWebApp: {
    capable: true,
    title: "Dojo",
    statusBarStyle: "black-translucent",
  },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1117",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
          <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
          <Nav />
        </div>
      </body>
    </html>
  );
}
