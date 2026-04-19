import { createFileRoute } from '@tanstack/react-router';

import { FeaturedCarousel } from '~/components/featured-carousel';
import { UserWidgets } from '~/components/user-widgets';
import { ProjectsView } from '~/components/projects-view';

export const Route = createFileRoute('/dashboard/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex h-full gap-6 p-6">
      <div className="flex flex-col gap-12">
        <FeaturedCarousel />

        <ProjectsView className="pl-2" />
      </div>

      <UserWidgets />
    </div>
  );
}
