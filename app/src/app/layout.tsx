import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/components.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StudyDesk • Intentional Learning Wrapper for YouTube",
  description: "Transform passive YouTube course watching into an active, high-retention classroom experience.",
};

// Applies the saved theme before first paint on every page (not just the dashboard), so reloads
// and direct links never flash or stick in light mode. Mirrors the toggle in app/page.tsx.
const themeInitScript = `(function(){try{var t=localStorage.getItem("studydesk_theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--color-bg-app)] text-[var(--color-text-primary)]">
        {children}
      </body>
    </html>
  );
}
