import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Dashboard } from '@/features/dashboard/components/Dashboard';

export function DashboardPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header - Full Width */}
      <Header />

      {/* Content Area - Sidebar + Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container mx-auto px-4 py-6 lg:px-8">
            <Dashboard />
          </div>
        </main>
      </div>
    </div>
  );
}
