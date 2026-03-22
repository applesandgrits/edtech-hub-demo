import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const dimension = request.nextUrl.searchParams.get("dimension");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam) : null;

  // Return top N facets for ALL dimensions in one call
  if (dimension === "all") {
    const facets = await sql.query(
      `SELECT facet_type, facet_value, COUNT(*) as doc_count,
              array_agg(document_id) as doc_ids
       FROM document_facets
       GROUP BY facet_type, facet_value
       ORDER BY facet_type, COUNT(*) DESC`
    );
    // Group by dimension and optionally limit per dimension
    const grouped: Record<string, any[]> = {};
    for (const row of facets) {
      const key = row.facet_type;
      if (!grouped[key]) grouped[key] = [];
      if (!limit || grouped[key].length < limit) {
        grouped[key].push({
          facet_value: row.facet_value,
          doc_count: row.doc_count,
          doc_ids: row.doc_ids,
        });
      }
    }
    return NextResponse.json({ dimensions: grouped });
  }

  if (dimension) {
    let query = `SELECT facet_value, COUNT(*) as doc_count,
              array_agg(document_id) as doc_ids
       FROM document_facets
       WHERE facet_type = $1
       GROUP BY facet_value
       ORDER BY COUNT(*) DESC`;
    const params: any[] = [dimension];
    if (limit) {
      query += ` LIMIT $2`;
      params.push(limit);
    }
    const facets = await sql.query(query, params);
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
