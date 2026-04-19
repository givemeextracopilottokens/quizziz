import { createServerFn } from '@tanstack/react-start';
import { eq, ilike, gte, lte, asc, desc, and, or, SQL } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '~/db';
import { projects } from '~/db/schema/app';
import { user } from '~/db/schema/auth';

const searchQuizzesSchema = z.object({
  search: z.string().optional().default(''),
  userId: z.string().optional(),
  sortBy: z.enum(['title', 'updated']).optional().default('updated'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const searchQuizzes = createServerFn({ method: 'GET' })
  .inputValidator(searchQuizzesSchema)
  .handler(async ({ data }) => {
    try {
      const conditions: SQL[] = [];

      // Search by title or description
      if (data.search) {
        conditions.push(
          or(
            ilike(projects.title, `%${data.search}%`),
            ilike(projects.description, `%${data.search}%`),
          )!,
        );
      }

      // Filter by user
      if (data.userId) {
        conditions.push(eq(projects.userId, data.userId));
      }

      // Filter by date range
      if (data.dateFrom) {
        conditions.push(gte(projects.updatedAt, new Date(data.dateFrom)));
      }
      if (data.dateTo) {
        const endOfDay = new Date(data.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(lte(projects.updatedAt, endOfDay));
      }

      // Build query with joins
      let query: any = db
        .select({
          id: projects.id,
          title: projects.title,
          description: projects.description,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
          userId: projects.userId,
          userName: user.name,
          userImage: user.image,
        })
        .from(projects)
        .innerJoin(user, eq(projects.userId, user.id));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Sort
      if (data.sortBy === 'title') {
        query =
          data.sortOrder === 'asc'
            ? query.orderBy(asc(projects.title))
            : query.orderBy(desc(projects.title));
      } else {
        query =
          data.sortOrder === 'asc'
            ? query.orderBy(asc(projects.updatedAt))
            : query.orderBy(desc(projects.updatedAt));
      }

      const results = await query.limit(50);

      // Get all users for filter dropdown
      const allUsers = await db
        .select({
          id: user.id,
          name: user.name,
        })
        .from(user);

      return {
        success: true,
        data: {
          quizzes: results,
          users: allUsers,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to search quizzes',
      };
    }
  });
