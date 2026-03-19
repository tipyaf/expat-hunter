import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-primary mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
            <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Contacts
            </h2>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
            <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Emails envoyes
            </h2>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
            <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Pipeline
            </h2>
            <p className="text-2xl font-bold">0</p>
          </div>
        </div>
      </main>
    </div>
  );
}
