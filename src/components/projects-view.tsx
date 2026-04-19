import type { ComponentProps } from 'react';
import { useState } from 'react';
import { createServerFn } from '@tanstack/react-start';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';
import { formatDistanceToNow } from 'date-fns';
import { IconPlus, IconPuzzle, IconSearch } from '@tabler/icons-react';
import { toast } from 'sonner';

import { db } from '~/db';
import { projects } from '~/db/schema/app';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '~/components/ui/item';
import { cn } from '~/lib/utils';
import { getSession } from '~/lib/auth-functions';

const queryProjects = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession();
  const userId = session?.user.id;

  if (userId === undefined) return [];

  const data = await db.query.projects.findMany({
    where: eq(projects.userId, userId),
  });

  return data;
});

const createProject = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await getSession();
  const userId = session?.user.id;

  if (userId === undefined) {
    throw new Error('Unauthorized');
  }

  const projectId = crypto.randomUUID();
  const defaultTitle = 'Untitled Project';

  await db.insert(projects).values({
    id: projectId,
    userId,
    title: defaultTitle,
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { projectId };
});

export function ProjectsView({ className, ...props }: ComponentProps<'div'>) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: allProjects, isLoading } = useQuery({
    queryKey: ['user-projects'],
    queryFn: queryProjects,
  });

  const filteredProjects =
    allProjects?.filter(project =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase()),
    ) ?? [];

  const handleCreateProject = async () => {
    try {
      const { projectId } = await createProject();
      await navigate({
        to: '/dashboard/project/$projectId',
        params: { projectId },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create project',
      );
    }
  };

  return (
    <div className={cn('flex flex-col gap-4', className)} {...props}>
      <div className="flex items-center justify-between **:h-8">
        <InputGroup className="w-70">
          <InputGroupInput
            placeholder="Search for a project"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <InputGroupAddon>
            <IconSearch />
          </InputGroupAddon>
        </InputGroup>

        <Button
          variant="default"
          onClick={handleCreateProject}
          className="cursor-pointer gap-3 border border-emerald-700 px-3"
        >
          <IconPlus /> New project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 p-6"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProjects && filteredProjects.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <Link
              to="/dashboard/project/$projectId"
              params={{ projectId: project.id }}
              className="animate-in duration-700 ease-out fill-mode-both zoom-in-95 fade-in"
              key={project.id}
            >
              <Item
                variant="outline"
                className="gap-4 px-6 py-4 hover:bg-neutral-900"
              >
                <ItemMedia>
                  <IconPuzzle />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{project.title}</ItemTitle>
                  <ItemDescription suppressHydrationWarning className="text-xs">
                    Updated{' '}
                    {formatDistanceToNow(project.updatedAt, {
                      addSuffix: true,
                    })}
                  </ItemDescription>
                </ItemContent>
              </Item>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900 p-12 text-center">
          <p className="text-neutral-400">
            {searchQuery
              ? 'No projects found matching your search.'
              : 'No projects yet. Click "New project" to get started!'}
          </p>
        </div>
      )}
    </div>
  );
}
