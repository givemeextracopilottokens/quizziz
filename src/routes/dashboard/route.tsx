import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { DashboardHeader } from '~/components/dashboard-header';
import { DashboardSidebar } from '~/components/dashboard-sidebar';
import { SidebarProvider } from '~/components/ui/sidebar';
import { getSession } from '~/lib/auth-functions';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ location }) => {
    const session = await getSession();

    if (!session) {
      throw redirect({
        to: '/sign-in',
        search: { callbackURL: location.href },
      });
    }

    return { user: session.user };
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="[--header-height:calc(--spacing(12))]">
      <SidebarProvider className="flex flex-col">
        <DashboardHeader />

        <div className="flex flex-1">
          <DashboardSidebar />

          <div className="w-full pl-[calc(var(--sidebar-width-icon)+1px)]">
            <Outlet />
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
