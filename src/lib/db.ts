import { neon } from "@neondatabase/serverless";

export function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return sql;
}

export type Document = {
  id: string;
  title: string;
  abstract: string | null;
  authors: { firstName: string; lastName: string }[];
  item_type: string | null;
  date_published: string | null;
  doi: string | null;
  url: string | null;
  rights: string | null;
  tags: string[];
  collections: Record<string, string>[] | null;
  institution: string[];
  full_text: string | null;
  ai_summary: string | null;
  created_at: string;
};
