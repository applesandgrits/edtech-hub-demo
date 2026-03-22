import Link from "next/link";

interface DocCardProps {
  id: string;
  title: string;
  abstract: string | null;
  authors: { firstName: string; lastName: string }[];
  item_type: string | null;
  date_published: string | null;
  tags: string[];
  ai_summary: string | null;
  similarity?: number;
}

export default function DocCard({
  id,
  title,
  abstract,
  authors,
  item_type,
  date_published,
  tags,
  ai_summary,
  similarity,
}: DocCardProps) {
  const authorList =
    typeof authors === "string" ? JSON.parse(authors) : authors || [];
  const authorStr = authorList
    .slice(0, 3)
    .map((a: any) => `${a.firstName} ${a.lastName}`.trim())
    .join(", ");
  const moreAuthors = authorList.length > 3 ? ` +${authorList.length - 3}` : "";

  const displayText = ai_summary || abstract;
  const truncated = displayText
    ? displayText.length > 200
      ? displayText.slice(0, 200) + "..."
      : displayText
    : "No abstract available.";

  const year = date_published ? new Date(date_published).getFullYear() : null;

  return (
    <Link href={`/doc/${id}`} className="block">
      <div
        className="rounded-lg p-5 hover:shadow-md transition-all"
        style={{
          background: "white",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {item_type && (
                <span
                  className="inline-block px-2 py-0.5 text-xs font-medium rounded"
                  style={{ background: "rgba(92,172,253,0.15)", color: "#3B8DE8" }}
                >
                  {item_type}
                </span>
              )}
              {year && (
                <span className="text-xs" style={{ color: "#A1A1AA" }}>{year}</span>
              )}
              {similarity !== undefined && (
                <span
                  className="text-xs font-mono"
                  style={{ color: "#DC3900" }}
                >
                  {(similarity * 100).toFixed(0)}% match
                </span>
              )}
            </div>
            <h3
              className="text-base font-semibold mb-1 line-clamp-2"
              style={{ color: "#11181C" }}
            >
              {title}
            </h3>
            {authorStr && (
              <p className="text-sm mb-2" style={{ color: "#71717A" }}>
                {authorStr}
                {moreAuthors}
              </p>
            )}
            <p className="text-sm line-clamp-3" style={{ color: "#71717A" }}>
              {truncated}
            </p>
          </div>
        </div>
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded"
                style={{ background: "#EAE9E5", color: "#71717A" }}
              >
                {tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="text-xs" style={{ color: "#A1A1AA" }}>
                +{tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
