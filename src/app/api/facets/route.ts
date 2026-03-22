import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const dimension = request.nextUrl.searchParams.get("dimension");

  if (dimension) {
    // Get all values for a specific facet type with document counts
    const facets = await sql.query(
      `SELECT facet_value, COUNT(*) as doc_count,
              array_agg(document_id) as doc_ids
       FROM document_facets
       WHERE facet_type = $1
       GROUP BY facet_value
       ORDER BY COUNT(*) DESC`,
      [dimension]
    );
    return NextResponse.json({ dimension, facets });
  }

  // Get summary of all facet types
  const summary = await sql`
    SELECT facet_type,
           COUNT(DISTINCT facet_value) as unique_values,
           COUNT(DISTINCT document_id) as doc_count
    FROM document_facets
    GROUP BY facet_type
    ORDER BY facet_type
  `;

  return NextResponse.json({ dimensions: summary });
}
