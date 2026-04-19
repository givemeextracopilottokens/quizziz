import { createFileRoute } from '@tanstack/react-router';

import { ProjectsView } from '~/components/projects-view';

export const Route = createFileRoute('/dashboard/projects')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto my-16 grid max-w-3/5 gap-4">
      <h2 className="mb-12 text-2xl font-medium">Your Projects</h2>

      <ProjectsView />
    </div>
  );
}
