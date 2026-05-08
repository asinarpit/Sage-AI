export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen bg-background text-foreground overflow-hidden">
      <main className="h-full flex flex-col relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
