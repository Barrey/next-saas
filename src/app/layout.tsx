import "@/styles/globals.css";

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
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
