import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '~/db';
import { projects, questions, answers } from '~/db/schema/app';

interface SerializedAnswer {
  text: string;
  isCorrect: boolean;
  order: number;
}

interface SerializedQuestion {
  title: string;
  type: 'boolean' | 'standard' | 'input';
  explanation: string;
  allowedTime: number;
  doublePoints: boolean;
  order: number;
  answers: SerializedAnswer[];
}

interface SerializedQuiz {
  questions: SerializedQuestion[];
}

interface QuizDiff {
  toDelete: number[];
  toUpdate: Array<{ id: number; data: SerializedQuestion }>;
  toInsert: SerializedQuestion[];
}

function serializeQuizData(quizState: {
  questions: Array<{
    title: string;
    type: 'boolean' | 'standard' | 'input';
    explanation: string;
    allowedTime: number;
    doublePoints: boolean;
    answers: Array<{ text: string; isCorrect: boolean }>;
  }>;
}): SerializedQuiz {
  return {
    questions: quizState.questions.map((q, idx) => ({
      title: q.title,
      type: q.type,
      explanation: q.explanation,
      allowedTime: q.allowedTime,
      doublePoints: q.doublePoints,
      order: idx,
      answers: q.answers.map((a, aIdx) => ({
        text: a.text,
        isCorrect: a.isCorrect,
        order: aIdx,
      })),
    })),
  };
}

async function computeQuizDiff(
  projectId: string,
  newQuizData: SerializedQuiz,
): Promise<QuizDiff> {
  const existingQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.projectId, projectId));

  const questionIds = existingQuestions.map(q => q.id);
  let existingAnswers: (typeof answers.$inferSelect)[] = [];
  if (questionIds.length > 0) {
    existingAnswers = await db.select().from(answers);
  }

  const toDelete: number[] = [];
  const toUpdate: Array<{ id: number; data: SerializedQuestion }> = [];
  const toInsert: SerializedQuestion[] = [];

  const sortedExisting = [...existingQuestions].sort(
    (a, b) => a.order - b.order,
  );

  newQuizData.questions.forEach((newQ, idx) => {
    const existingQ = sortedExisting[idx];

    if (!existingQ) {
      toInsert.push(newQ);
    } else {
      const existingQAnswers = existingAnswers
        .filter(a => a.questionId === existingQ.id)
        .sort((a, b) => a.order - b.order);

      const questionChanged =
        existingQ.title !== newQ.title ||
        existingQ.type !== newQ.type ||
        existingQ.explanation !== newQ.explanation ||
        existingQ.allowedTime !== newQ.allowedTime ||
        existingQ.doublePoints !== newQ.doublePoints;

      const answersChanged =
        existingQAnswers.length !== newQ.answers.length ||
        existingQAnswers.some(
          (a, aIdx) =>
            a.text !== newQ.answers[aIdx]?.text ||
            a.isCorrect !== newQ.answers[aIdx]?.isCorrect,
        );

      if (questionChanged || answersChanged) {
        toUpdate.push({ id: existingQ.id, data: newQ });
      }
    }
  });

  if (sortedExisting.length > newQuizData.questions.length) {
    for (let i = newQuizData.questions.length; i < sortedExisting.length; i++) {
      toDelete.push(sortedExisting[i].id);
    }
  }

  return { toDelete, toUpdate, toInsert };
}

async function syncQuizToDatabase(
  projectId: string,
  newQuizData: SerializedQuiz,
): Promise<void> {
  const diff = await computeQuizDiff(projectId, newQuizData);

  try {
    for (const questionId of diff.toDelete) {
      await db.delete(questions).where(eq(questions.id, questionId));
    }

    for (const { id, data } of diff.toUpdate) {
      await db
        .update(questions)
        .set({
          title: data.title,
          type: data.type,
          explanation: data.explanation,
          allowedTime: data.allowedTime,
          doublePoints: data.doublePoints,
          order: data.order,
          updatedAt: new Date(),
        })
        .where(eq(questions.id, id));

      await db.delete(answers).where(eq(answers.questionId, id));

      if (data.answers.length > 0) {
        await db.insert(answers).values(
          data.answers.map(a => ({
            questionId: id,
            text: a.text,
            isCorrect: a.isCorrect,
            order: a.order,
          })),
        );
      }
    }

    for (const newQ of diff.toInsert) {
      const [insertedQuestion] = await db
        .insert(questions)
        .values({
          projectId,
          title: newQ.title,
          type: newQ.type,
          explanation: newQ.explanation,
          allowedTime: newQ.allowedTime,
          doublePoints: newQ.doublePoints,
          order: newQ.order,
        })
        .returning({ id: questions.id });

      if (newQ.answers.length > 0 && insertedQuestion) {
        await db.insert(answers).values(
          newQ.answers.map(a => ({
            questionId: insertedQuestion.id,
            text: a.text,
            isCorrect: a.isCorrect,
            order: a.order,
          })),
        );
      }
    }

    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  } catch (error) {
    throw new Error(
      `Failed to sync quiz: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export const SaveQuizInput = z.object({
  projectId: z.string(),
  quizState: z.object({
    questions: z.array(
      z.object({
        title: z.string(),
        type: z.enum(['boolean', 'standard', 'input']),
        explanation: z.string(),
        allowedTime: z.number(),
        doublePoints: z.boolean(),
        answers: z.array(
          z.object({
            text: z.string(),
            isCorrect: z.boolean(),
          }),
        ),
      }),
    ),
  }),
});

export const saveQuiz = createServerFn({ method: 'POST' })
  .inputValidator(SaveQuizInput)
  .handler(async ({ data }) => {
    try {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, data.projectId),
      });

      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const serialized = serializeQuizData(data.quizState);
      await syncQuizToDatabase(data.projectId, serialized);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save quiz project',
      };
    }
  });
