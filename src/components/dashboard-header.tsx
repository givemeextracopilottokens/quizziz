import type { ComponentProps } from 'react';
import { getRouteApi, Link, useLocation } from '@tanstack/react-router';
import {
  IconCalendarSearch,
  IconHelp,
  IconLogout,
  IconSearch,
  IconSelector,
  IconSettings,
  IconStack2,
  IconTableColumn,
} from '@tabler/icons-react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Item, ItemActions, ItemMedia, ItemTitle } from '~/components/ui/item';
import { Separator } from '~/components/ui/separator';
import { authClient } from '~/lib/auth-client';
import { formatInitials } from '~/lib/profile';
import { cn } from '~/lib/utils';

const routeApi = getRouteApi('/dashboard');

export function DashboardHeader({
  className,
  ...props
}: ComponentProps<'header'>) {
  const { user } = routeApi.useRouteContext();
  const navigate = routeApi.useNavigate();

  const location = useLocation();

  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-(--header-height) w-full items-center gap-4 border-b bg-background px-4',
        className,
      )}
      {...props}
    >
      <Link to="/dashboard">
        <IconStack2 className="stroke-emerald-400" />
      </Link>

      <Separator orientation="skew" />

      <Popover>
        <PopoverTrigger
          nativeButton={false}
          render={
            <Item size="sm" className="w-fit cursor-pointer px-0">
              <ItemMedia variant="image">
                <Avatar size="sm">
                  <AvatarFallback className="bg-linear-65 from-purple-500 to-pink-500 text-white">
                    {formatInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemTitle className="text-base">{user.name}</ItemTitle>
              <ItemActions>
                <IconSelector
                  size={20}
                  className="stroke-muted-foreground stroke-1"
                />
              </ItemActions>
            </Item>
          }
        />
        <PopoverContent className="p-2" align="end">
          <div className="relative mb-3 h-14 rounded-md bg-linear-65 from-purple-500 to-pink-500">
            <Avatar
              size="lg"
              className="absolute -bottom-3 left-6 border-2 border-foreground"
            >
              <AvatarFallback className="bg-linear-65 from-purple-500 to-pink-500 text-foreground">
                {formatInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="mb-2 grid gap-0.5 pl-2">
            <span className="text-lg font-semibold">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>

          <div className="grid gap-2">
            <Button
              variant="secondary"
              nativeButton={false}
              className="justify-start"
              render={
                <Link to="/">
                  <>
                    <IconSettings />
                    Account settings
                  </>
                </Link>
              }
            />

            <Button
              variant="destructive"
              onClick={async () => {
                await authClient.signOut();
                await navigate({
                  to: '/sign-in',
                  search: { callbackURL: location.pathname },
                });
              }}
              className="justify-start"
            >
              <IconLogout />
              Log out
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="skew" />

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              className="inline-flex items-center gap-1.5"
              render={
                <Link to="/">
                  <IconCalendarSearch size={18} /> Tasks
                </Link>
              }
            />
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbPage className="inline-flex items-center gap-1.5">
              <IconTableColumn size={18} /> Project dashboard
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-4 *:h-8">
        <InputGroup>
          <InputGroupInput placeholder="Search" />
          <InputGroupAddon>
            <IconSearch />
          </InputGroupAddon>
        </InputGroup>

        <Button variant="outline">
          <IconHelp /> Help
        </Button>
      </div>
    </header>
  );
}
