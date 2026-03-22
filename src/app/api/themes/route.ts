import { neon } from "@neondatabase/serverless";
import OpenAI from "openai";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple k-means clustering on embeddings
function kMeans(
  points: { id: string; embedding: number[] }[],
  k: number,
  maxIter = 20
): { centroid: number[]; members: string[] }[] {
  const dim = points[0].embedding.length;

  // Initialize centroids randomly
  const centroids: number[][] = [];
  const used = new Set<number>();
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * points.length);
    if (!used.has(idx)) {
      used.add(idx);
      centroids.push([...points[idx].embedding]);
    }
  }

  let assignments: number[] = new Array(points.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign each point to nearest centroid
    const newAssignments = points.map((p) => {
      let minDist = Infinity;
      let best = 0;
      for (let c = 0; c < k; c++) {
        let dist = 0;
        for (let d = 0; d < dim; d++) {
          dist += (p.embedding[d] - centroids[c][d]) ** 2;
        }
        if (dist < minDist) {
          minDist = dist;
          best = c;
        }
      }
      return best;
    });

    // Check convergence
    if (JSON.stringify(newAssignments) === JSON.stringify(assignments)) break;
    assignments = newAssignments;

    // Update centroids
    for (let c = 0; c < k; c++) {
      const members = points.filter((_, i) => assignments[i] === c);
      if (members.length === 0) continue;
      for (let d = 0; d < dim; d++) {
        centroids[c][d] =
          members.reduce((sum, m) => sum + m.embedding[d], 0) / members.length;
      }
    }
  }

  // Build clusters
  const clusters: { centroid: number[]; members: string[] }[] = [];
  for (let c = 0; c < k; c++) {
    clusters.push({
      centroid: centroids[c],
      members: points
        .filter((_, i) => assignments[i] === c)
        .map((p) => p.id),
    });
  }

  return clusters.filter((c) => c.members.length > 0);
}

// Simple PCA-like 2D projection using the first 2 principal directions
function project2D(
  points: { id: string; embedding: number[] }[]
): { id: string; x: number; y: number }[] {
  const dim = points[0].embedding.length;
  const n = points.length;

  // Compute mean
  const mean = new Array(dim).fill(0);
  for (const p of points) {
    for (let d = 0; d < dim; d++) mean[d] += p.embedding[d];
  }
  for (let d = 0; d < dim; d++) mean[d] /= n;

  // Center the data
  const centered = points.map((p) =>
    p.embedding.map((v, d) => v - mean[d])
  );

  // Use power iteration to find top 2 directions
  function powerIteration(data: number[][], avoid?: number[]): number[] {
    let v = new Array(dim).fill(0).map(() => Math.random() - 0.5);
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    v = v.map((x) => x / norm);

    for (let iter = 0; iter < 50; iter++) {
      // Multiply by covariance: v_new = sum(x * (x . v)) / n
      const vNew = new Array(dim).fill(0);
      for (const x of data) {
        const dot = x.reduce((s, xi, d) => s + xi * v[d], 0);
        for (let d = 0; d < dim; d++) vNew[d] += x[d] * dot;
      }

      // Orthogonalize against avoided direction
      if (avoid) {
        const dotAvoid = vNew.reduce((s, x, d) => s + x * avoid[d], 0);
        for (let d = 0; d < dim; d++) vNew[d] -= dotAvoid * avoid[d];
      }

      norm = Math.sqrt(vNew.reduce((s, x) => s + x * x, 0));
      v = vNew.map((x) => x / (norm || 1));
    }
    return v;
  }

  const pc1 = powerIteration(centered);
  const pc2 = powerIteration(centered, pc1);

  // Project
  return points.map((p, i) => ({
    id: p.id,
    x: centered[i].reduce((s, v, d) => s + v * pc1[d], 0),
    y: centered[i].reduce((s, v, d) => s + v * pc2[d], 0),
  }));
}

export async function GET() {
  // Get document embeddings (use the first chunk per document as representative)
  const rows = await sql`
    SELECT DISTINCT ON (e.document_id)
      e.document_id as id,
      d.title,
      d.item_type,
      d.ai_summary,
      e.embedding::text as embedding_text
    FROM embeddings e
    JOIN documents d ON d.id = e.document_id
    WHERE e.chunk_index = 0
    ORDER BY e.document_id, e.chunk_index
  `;

  // Parse embeddings
  const points = rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    item_type: r.item_type,
    ai_summary: r.ai_summary,
    embedding: JSON.parse(r.embedding_text) as number[],
  }));

  // Cluster into 6 themes
  const clusters = kMeans(
    points.map((p) => ({ id: p.id, embedding: p.embedding })),
    6
  );

  // Project to 2D
  const projected = project2D(
    points.map((p) => ({ id: p.id, embedding: p.embedding }))
  );

  // Build projections map
  const projMap = new Map(projected.map((p) => [p.id, { x: p.x, y: p.y }]));

  // Generate theme labels using AI
  const themePromises = clusters.map(async (cluster, i) => {
    const clusterDocs = cluster.members
      .map((id) => points.find((p) => p.id === id))
      .filter(Boolean);

    const titles = clusterDocs.map((d) => d!.title).join("\n- ");

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "Generate a short theme label (3-6 words) for this cluster of education technology documents. Return ONLY the label, nothing else.",
        },
        {
          role: "user",
          content: `Documents in this cluster:\n- ${titles}`,
        },
      ],
      max_tokens: 20,
    });

    return {
      id: i,
      label: response.choices[0].message.content?.trim() || `Theme ${i + 1}`,
      docs: clusterDocs.map((d) => ({
        id: d!.id,
        title: d!.title,
        item_type: d!.item_type,
        ai_summary: d!.ai_summary?.slice(0, 120),
        x: projMap.get(d!.id)?.x || 0,
        y: projMap.get(d!.id)?.y || 0,
      })),
    };
  });

  const themes = await Promise.all(themePromises);

  // Normalize coordinates to 0-100 range
  const allX = themes.flatMap((t) => t.docs.map((d) => d.x));
  const allY = themes.flatMap((t) => t.docs.map((d) => d.y));
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  for (const theme of themes) {
    for (const doc of theme.docs) {
      doc.x = ((doc.x - minX) / rangeX) * 80 + 10; // 10-90 range
      doc.y = ((doc.y - minY) / rangeY) * 80 + 10;
    }
  }

  return NextResponse.json({ themes });
}
