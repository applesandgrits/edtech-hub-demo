import { pgTable, serial, varchar, integer, timestamp, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  googleId: varchar("google_id", { length: 255 }).unique(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  name: varchar("name", { length: 200 }),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  aiUsageMicrodollars: integer("ai_usage_microdollars").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  documentId: text("document_id").notNull(),
  userId: integer("user_id").notNull(),
  parentId: integer("parent_id"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
