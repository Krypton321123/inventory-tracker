// app/(app)/layout.tsx
import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pt-14 md:pt-0 md:ml-60">
        {children}
      </main>
    </div>
  );
}