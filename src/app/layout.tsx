import "@/styles/globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata = {
  title: "NextSaas Boilerplate",
  description: "Production-ready Next.js SaaS starter kit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased transition-colors duration-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
