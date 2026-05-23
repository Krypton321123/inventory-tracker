import type { Metadata } from "next";

import "./globals.css";
import Sidebar from "@/components/Sidebar";



export const metadata: Metadata = {
  title: "StockFlow - Inventory Manager",
  description: "Modern inventory management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`bg-gray-950 text-gray-100`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-64 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
