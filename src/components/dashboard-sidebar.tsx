import type { ComponentProps } from 'react';
import { Link } from '@tanstack/react-router';
import {
  IconArrowForward,
  IconFolderOpen,
  IconFolderPlus,
  IconHelp,
  IconHome,
  IconListSearch,
  IconPlayerPlay,
  IconReportAnalytics,
  IconSettings,
  IconWorld,
} from '@tabler/icons-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar';
import { cn } from '~/lib/utils';

const data = [
  [
    {
      link: '/dashboard',
      title: 'Home',
      icon: IconHome,
    },
    {
      link: '/explore',
      title: 'Explore',
      icon: IconListSearch,
    },
    {
      link: '/dashboard/projects',
      title: 'My Projects',
      icon: IconFolderOpen,
    },
  ],
  [
    {
      link: '/dashboard/create',
      title: 'Create Project',
      icon: IconFolderPlus,
    },
    {
      link: '/join',
      title: 'Join Game',
      icon: IconArrowForward,
    },
    {
      link: '/dashboard/start',
      title: 'Start Game',
      icon: IconPlayerPlay,
    },
    {
      link: '/dashboard/game-analytics',
      title: 'Game Analytics',
      icon: IconReportAnalytics,
    },
  ],
  [
    {
      link: '/dashboard/settings',
      title: 'Settings',
      icon: IconSettings,
    },
    {
      link: '/dashboard',
      title: 'Language',
      icon: IconWorld,
    },
    {
      link: '/dashboard',
      title: 'About',
      icon: IconHelp,
    },
  ],
];

export function DashboardSidebar({
  className,
  ...props
}: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="none"
      className={cn(
        'absolute top-(--header-height) z-2 h-[calc(100svh-var(--header-height))]! w-[calc(var(--sidebar-width-icon)+1px)] border-r bg-background transition-[width] duration-100 ease-linear hover:w-(--sidebar-width)',
        className,
      )}
      {...props}
    >
      <SidebarContent>
        {data.map((group, i) => (
          <SidebarGroup className="px-3" key={i}>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.map((item, i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuButton
                      tooltip={{ children: item.title, hidden: false }}
                      className="px-1.5 [&_svg]:size-5"
                      render={
                        <Link to={item.link}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
