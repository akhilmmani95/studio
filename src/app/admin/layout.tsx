import { AdminNav } from '@/components/admin/AdminNav';
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen flex-col">
        <div className="flex-1">
          <Sidebar collapsible="none">
            <AdminNav />
          </Sidebar>
          <SidebarInset>
            <main>{children}</main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
