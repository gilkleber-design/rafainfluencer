import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://rafastudio.profgilkleber.com.br"),
  title: "Rafa Studio",
  description: "Da ideia ao próximo take.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Rafa Studio",
    title: "Rafa Studio",
    description: "Da ideia ao próximo take.",
    url: "/",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Logo rafa. Studio com a frase Da ideia ao próximo take." }],
  },
  twitter: { card: "summary_large_image", title: "Rafa Studio", description: "Da ideia ao próximo take.", images: ["/og.jpg"] },
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#120F17",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="rs-theme">
      <body>{children}</body>
    </html>
  );
}
