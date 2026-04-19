import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

export const projects = pgTable('projects', {
  id: text().primaryKey(),
  userId: text()
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
  title: text().notNull(),
  description: text(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const questionType = pgEnum('question_type', [
  'boolean',
  'standard',
  'input',
]);

export const questions = pgTable('questions', {
  id: serial().primaryKey(),
  projectId: text()
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  title: text().notNull(),
  type: questionType().notNull(),
  explanation: text(),
  allowedTime: integer().default(0).notNull(),
  doublePoints: boolean().default(false).notNull(),
  order: integer().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const answers = pgTable('answers', {
  id: serial().primaryKey(),
  questionId: integer()
    .references(() => questions.id, { onDelete: 'cascade' })
    .notNull(),
  text: text().notNull(),
  isCorrect: boolean().default(false).notNull(),
  order: integer().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  users: one(user, {
    fields: [projects.userId],
    references: [user.id],
  }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  project: one(projects, {
    fields: [questions.projectId],
    references: [projects.id],
  }),
  answers: many(answers),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
}));
