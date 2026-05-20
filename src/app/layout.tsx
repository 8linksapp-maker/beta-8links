import type { Metadata } from "next";
import { Outfit, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "8links — Piloto Automático de SEO",
  description: "Backlinks ilimitados, artigos com IA, e monitoramento completo. Tudo no automático.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${ibmPlexMono.variable} h-full`}
    >
      <body className="min-h-full bg-background text-foreground antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--card)",
              border: "1px solid var(--border-strong)",
              color: "var(--foreground)",
            },
          }}
        />
      </body>
    </html>
  );
}
