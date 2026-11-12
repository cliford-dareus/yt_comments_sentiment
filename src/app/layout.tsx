import type { Metadata } from "next";
import { Roboto_Condensed } from "next/font/google";
import "./globals.css";
import AuthSessionProvider from "@/components/providers/session-provider";
import { BRAND } from "@/lib/brand";

const roboto = Roboto_Condensed({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={roboto.className}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
