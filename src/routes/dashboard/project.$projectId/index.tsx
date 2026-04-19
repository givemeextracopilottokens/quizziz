'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  IconTrash,
  IconArrowLeft,
  IconClock,
  IconStar,
  IconPlayerPlay,
  IconListNumbers,
  IconCalendarClock,
  IconEdit,
} from '@tabler/icons-react';

import { db } from '~/db';
import { projects, questions, answers } from '~/db/schema/app';
import { getSession } from '~/lib/auth-functions';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog';
import { Badge } from '~/components/ui/badge';

const getProjectData = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ projectId: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSession();
    const userId = session?.user.id;

    if (userId === undefined) {
      throw new Error('Unauthorized');
    }

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.userId, userId), eq(projects.id, data.projectId)),
      with: {
        questions: {
          with: {
            answers: {
              orderBy: (a, { asc }) => asc(a.order),
            },
          },
          orderBy: (q, { asc }) => asc(q.order),
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    return { project };
  });

const updateProject = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      projectId: z.string(),
      title: z.string(),
      description: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSession();
    const userId = session?.user.id;

    if (userId === undefined) {
      throw new Error('Unauthorized');
    }

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.userId, userId), eq(projects.id, data.projectId)),
    });

    if (!project) {
      throw new Error('Unauthorized');
    }

    await db
      .update(projects)
      .set({
        title: data.title,
        description: data.description,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, data.projectId));

    return { success: true };
  });

const deleteProject = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ projectId: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSession();
    const userId = session?.user.id;

    if (userId === undefined) {
      throw new Error('Unauthorized');
    }

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.userId, userId), eq(projects.id, data.projectId)),
    });

    if (!project) {
      throw new Error('Unauthorized');
    }

    await db.delete(projects).where(eq(projects.id, data.projectId));

    return { success: true };
  });

export const Route = createFileRoute('/dashboard/project/$projectId/')({
  loader: ({ params }) =>
    getProjectData({ data: { projectId: params.projectId } }),
  component: RouteComponent,
});

const AnswerColors = [
  {
    bg: 'bg-red-950',
    border: 'border-red-700',
    text: 'text-red-300',
    label: 'A',
    labelBg: 'bg-red-600',
  },
  {
    bg: 'bg-blue-950',
    border: 'border-blue-700',
    text: 'text-blue-300',
    label: 'B',
    labelBg: 'bg-blue-600',
  },
  {
    bg: 'bg-amber-950',
    border: 'border-amber-700',
    text: 'text-amber-300',
    label: 'C',
    labelBg: 'bg-amber-600',
  },
  {
    bg: 'bg-green-950',
    border: 'border-green-700',
    text: 'text-green-300',
    label: 'D',
    labelBg: 'bg-green-600',
  },
  {
    bg: 'bg-purple-950',
    border: 'border-purple-700',
    text: 'text-purple-300',
    label: 'E',
    labelBg: 'bg-purple-600',
  },
] as const;

function QuestionPreview({
  question,
}: {
  question: typeof questions.$inferSelect & {
    answers: (typeof answers.$inferSelect)[];
  };
}) {
  const correctCount = question.answers.filter(a => a.isCorrect).length;

  return (
    <Card className="overflow-hidden border-neutral-800 bg-neutral-900">
      <div
        className="relative flex h-full flex-col bg-neutral-950 p-6"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="relative z-10 mb-4 flex flex-wrap items-center gap-2 *:h-5">
          <Badge
            variant="outline"
            className="gap-1.5 rounded-sm border-lime-500 bg-lime-500/10 px-2.5 text-[10px] font-semibold tracking-wider text-lime-500 uppercase"
          >
            <span>?</span>
            <span>Question</span>
          </Badge>
          {question.allowedTime > 0 && (
            <span className="inline-flex items-center gap-1 rounded-sm border border-blue-400 bg-blue-400/10 px-2 text-[10px] font-medium text-blue-400">
              <IconClock size={10} />
              {question.allowedTime}s
            </span>
          )}
          {question.doublePoints && (
            <span className="inline-flex items-center gap-1 rounded-sm border border-amber-700 bg-amber-800/30 px-2 text-[10px] font-medium text-amber-400">
              <IconStar size={10} />
              2x
            </span>
          )}
          {correctCount > 1 && (
            <span className="inline-flex items-center rounded-sm bg-emerald-800/30 px-2 text-[10px] font-medium text-emerald-400">
              Multi-answer
            </span>
          )}
        </div>

        <h3 className="relative z-10 mb-6 text-base font-bold text-white">
          {question.title || 'Untitled Question'}
        </h3>

        <div className="relative z-10 grid gap-2">
          {question.answers.map((answer, idx) => {
            const colorConfig = AnswerColors[idx];
            const answerCount = question.answers.length;

            const minHeight =
              answerCount <= 2
                ? 'min-h-20'
                : answerCount <= 3
                  ? 'min-h-16'
                  : 'min-h-14';

            return (
              <div
                key={answer.id}
                className={`flex items-center gap-3 rounded px-3 py-2 ${minHeight} bg-neutral-800/30`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-bold ${
                    question.type !== 'input'
                      ? `${colorConfig.labelBg} text-white`
                      : 'bg-neutral-700 text-neutral-400'
                  }`}
                >
                  {question.type === 'boolean'
                    ? answer.text.charAt(0)
                    : colorConfig.label}
                </span>
                <span className="text-sm leading-snug text-neutral-300">
                  {answer.text || `Answer ${colorConfig.label}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

interface DeleteConfirmDialogProps {
  projectId: string;
  onClose: () => void;
}

function DeleteConfirmDialog({ projectId, onClose }: DeleteConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = Route.useNavigate();

  const handleDelete = useCallback(async () => {
    setIsLoading(true);
    try {
      await deleteProject({ data: { projectId } });
      toast.success('Project deleted successfully!');
      await navigate({ to: '/dashboard/projects' });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete project',
      );
      setIsLoading(false);
    }
  }, [projectId, navigate]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="border-neutral-800 bg-neutral-950">
        <DialogHeader>
          <DialogTitle className="text-white">Delete Project</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-neutral-400">
          This action cannot be undone. Are you sure you want to delete this
          project and all its questions?
        </p>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-neutral-700"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RouteComponent() {
  const { project } = Route.useLoaderData() as {
    project: typeof projects.$inferSelect & {
      questions: Array<
        typeof questions.$inferSelect & {
          answers: (typeof answers.$inferSelect)[];
        }
      >;
    };
  };
  const navigate = Route.useNavigate();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectData, setProjectData] = useState(project);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || '');
  const updateTimeoutRef = useRef<NodeJS.Timeout>(null);

  const handleRefresh = useCallback(async () => {
    const result = await getProjectData({ data: { projectId: project.id } });
    setProjectData(result.project);
  }, [project.id]);

  const debouncedUpdate = useCallback(
    (newTitle: string, newDescription: string) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(async () => {
        try {
          await updateProject({
            data: {
              projectId: project.id,
              title: newTitle,
              description: newDescription,
            },
          });
          toast.success('Project updated!');
          await handleRefresh();
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Failed to update project',
          );
          setTitle(projectData.title);
          setDescription(projectData.description || '');
        }
      }, 1000);
    },
    [project.id, projectData.title, projectData.description, handleRefresh],
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedUpdate(newTitle, description);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    debouncedUpdate(title, newDescription);
  };

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const totalQuestions = projectData.questions.length;

  return (
    <div className="hide-scrollbar flex h-full flex-col overflow-y-auto bg-neutral-950">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-950 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/dashboard/projects' })}
            className="text-neutral-400 hover:bg-neutral-900 hover:text-neutral-300"
          >
            <IconArrowLeft size={18} />
          </Button>
          <div className="flex-1">
            <Input
              value={title}
              onChange={handleTitleChange}
              placeholder="Project title"
              className="border-0 bg-transparent! p-0 text-2xl! font-bold text-white placeholder-neutral-600 shadow-none ring-0! outline-none"
            />
            <Input
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Project description"
              className="border-0 bg-transparent! p-0 text-sm! text-neutral-400 placeholder-neutral-600 shadow-none ring-0! outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() =>
              navigate({ to: '/dashboard/project/$projectId/edit' })
            }
            className="gap-2 bg-cyan-700 hover:bg-cyan-600"
          >
            <IconEdit size={16} />
            Edit project
          </Button>
          <Button
            size="sm"
            onClick={() => navigate({ to: '/play/$projectId' })}
            className="gap-2 bg-lime-600 text-white hover:bg-lime-500"
          >
            <IconPlayerPlay size={16} />
            Play Quiz
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="gap-2"
          >
            <IconTrash size={16} />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex-1">
        <div className="mx-auto space-y-6 p-6" style={{ maxWidth: '60%' }}>
          <div className="grid grid-cols-3 gap-4">
            <Card className="relative cursor-default overflow-hidden border-2 border-blue-500 bg-neutral-900 p-4 transition-all">
              <div className="absolute -right-3 -bottom-3 opacity-10">
                <IconClock size={80} className="text-blue-400" />
              </div>
              <div className="relative z-10 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded border-2 border-blue-500 bg-neutral-800">
                  <IconClock size={18} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-blue-400 uppercase">
                    Created
                  </div>
                  <div className="mt-1 text-sm font-medium text-white capitalize">
                    {formatDistanceToNow(new Date(projectData.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
            </Card>
            <Card className="relative cursor-default overflow-hidden border-2 border-amber-500 bg-neutral-900 p-4 transition-all">
              <div className="absolute -right-3 -bottom-3 opacity-10">
                <IconCalendarClock size={80} className="text-amber-400" />
              </div>
              <div className="relative z-10 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded border-2 border-amber-500 bg-neutral-800">
                  <IconCalendarClock size={18} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-amber-400 uppercase">
                    Last Modified
                  </div>
                  <div className="mt-1 text-sm font-medium text-white capitalize">
                    {formatDistanceToNow(new Date(projectData.updatedAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
            </Card>
            <Card className="relative cursor-default overflow-hidden border-2 border-lime-500 bg-neutral-900 p-4 transition-all">
              <div className="absolute -right-3 -bottom-3 opacity-10">
                <IconListNumbers size={80} className="text-lime-400" />
              </div>
              <div className="relative z-10 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded border-2 border-lime-500 bg-neutral-800">
                  <IconListNumbers size={18} className="text-lime-400" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-lime-400 uppercase">
                    Questions
                  </div>
                  <div className="mt-1 text-lg font-semibold text-lime-400">
                    {totalQuestions}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {totalQuestions > 0 && (
            <div>
              <h2 className="mb-4 text-xl font-bold text-white">Questions</h2>
              <div className="grid h-full gap-4 pr-2">
                {projectData.questions.map((question, index) => (
                  <div key={question.id}>
                    <div className="mb-3 flex items-center gap-3">
                      <Badge className="bg-neutral-800 text-neutral-300">
                        Q{index + 1}
                      </Badge>
                      <h3 className="text-lg font-semibold text-white">
                        {question.title || 'Untitled'}
                      </h3>
                      {question.type === 'boolean' && (
                        <Badge
                          variant="outline"
                          className="border-blue-500 text-blue-400"
                        >
                          True/False
                        </Badge>
                      )}
                      {question.type === 'standard' && (
                        <Badge
                          variant="outline"
                          className="border-purple-500 text-purple-400"
                        >
                          Multiple Choice
                        </Badge>
                      )}
                      {question.type === 'input' && (
                        <Badge
                          variant="outline"
                          className="border-orange-500 text-orange-400"
                        >
                          Free Text
                        </Badge>
                      )}
                    </div>
                    <QuestionPreview question={question} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalQuestions === 0 && (
            <Card className="border-dashed border-neutral-800 bg-neutral-900 p-12 text-center">
              <p className="text-neutral-400">
                No questions yet. Go to the editor to add some.
              </p>
              <Button
                className="mt-4 gap-2 bg-lime-600 text-white hover:bg-lime-500"
                onClick={() =>
                  navigate({ to: `/dashboard/project/${project.id}/edit` })
                }
              >
                Open Editor
              </Button>
            </Card>
          )}
        </div>
      </div>

      {showDeleteDialog && (
        <DeleteConfirmDialog
          projectId={projectData.id}
          onClose={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
}
