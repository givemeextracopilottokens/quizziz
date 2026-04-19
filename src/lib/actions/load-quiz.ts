import { createServerFn } from '@tanstack/react-start';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '~/db';
import { projects, questions, answers } from '~/db/schema/app';
import { getSession } from '~/lib/auth-functions';

interface Answer {
  text: string;
  isCorrect: boolean;
}

interface Question {
  title: string;
  type: 'boolean' | 'standard' | 'input';
  explanation: string;
  allowedTime: number;
  doublePoints: boolean;
  answers: Answer[];
}

export const loadQuiz = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ projectId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      const userId = session?.user.id;

      if (!userId) {
        return { success: false, error: 'Unauthorized' };
      }

      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, data.projectId),
          eq(projects.userId, userId),
        ),
      });

      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const dbQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.projectId, data.projectId));

      const sortedQuestions = dbQuestions.sort((a, b) => a.order - b.order);

      const questionIds = sortedQuestions.map(q => q.id);
      let dbAnswers: (typeof answers.$inferSelect)[] = [];
      if (questionIds.length > 0) {
        dbAnswers = await db.select().from(answers);
      }

      const transformedQuestions: Question[] = sortedQuestions.map(q => {
        const questionAnswers = dbAnswers
          .filter(a => a.questionId === q.id)
          .sort((a, b) => a.order - b.order)
          .map(a => ({
            text: a.text,
            isCorrect: a.isCorrect,
          }));

        return {
          title: q.title,
          type: q.type as 'boolean' | 'standard' | 'input',
          explanation: q.explanation ?? '',
          allowedTime: q.allowedTime,
          doublePoints: q.doublePoints,
          answers: questionAnswers,
        };
      });

      return {
        success: true,
        data: {
          project: {
            id: project.id,
            title: project.title,
            description: project.description,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          },
          questions: transformedQuestions,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load quiz',
      };
    }
  });
