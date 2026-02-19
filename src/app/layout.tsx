import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "RSVP Formatter - Speed Reading Tool",
  description: "An online tool for Rapid Serial Visual Presentation (RSVP) to help you read faster.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Toaster />
        {children}
      </body>
    </html>
  );
}
