"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

interface Comment {
  id: number;
  documentId: string;
  userId: number;
  parentId: number | null;
  body: string;
  createdAt: string;
  userName: string;
  userEmail: string;
  userRole: string;
  replies: Comment[];
}

export default function CommentsPanel({ documentId }: { documentId: string }) {
  const { user, token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?documentId=${documentId}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const submitComment = async (body: string, parentId?: number) => {
    if (!body.trim() || !token) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId, body, parentId }),
      });

      if (res.ok) {
        setNewComment("");
        setReplyText("");
        setReplyingTo(null);
        await fetchComments();
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (id: number) => {
    if (!token) return;
    await fetch(`/api/comments?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchComments();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  // Simple rich text: render **bold**, *italic*, and line breaks
  const renderBody = (text: string) => {
    return text.split("\n").map((line, i) => (
      <span key={i}>
        {i > 0 && <br />}
        {line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**"))
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          if (part.startsWith("*") && part.endsWith("*"))
            return <em key={j}>{part.slice(1, -1)}</em>;
          return <span key={j}>{part}</span>;
        })}
      </span>
    ));
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold" style={{ color: "#11181C" }}>
          Discussion
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#EAE9E5", color: "#71717A" }}>
          {comments.reduce((n, c) => n + 1 + c.replies.length, 0)}
        </span>
      </div>

      {/* New comment input */}
      {user && (
        <div className="mb-5">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment... (use **bold** or *italic*)"
            rows={3}
            className="w-full px-4 py-3 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#DC3900]/40"
            style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#11181C" }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px]" style={{ color: "#A1A1AA" }}>
              Supports **bold** and *italic*
            </span>
            <button
              onClick={() => submitComment(newComment)}
              disabled={!newComment.trim() || submitting}
              className="px-4 py-1.5 text-xs text-white rounded-md disabled:opacity-50 transition-colors"
              style={{ background: "#DC3900" }}
            >
              {submitting ? "Posting..." : "Post comment"}
            </button>
          </div>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <p className="text-sm py-4" style={{ color: "#A1A1AA" }}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm py-4" style={{ color: "#A1A1AA" }}>
          No comments yet. Be the first to start a discussion.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              {/* Top-level comment */}
              <CommentCard
                comment={comment}
                currentUserId={user?.id}
                currentUserRole={user?.role}
                onReply={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                onDelete={() => deleteComment(comment.id)}
                renderBody={renderBody}
                formatDate={formatDate}
              />

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="ml-8 mt-2 space-y-2" style={{ borderLeft: "2px solid #EAE9E5" }}>
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="pl-4">
                      <CommentCard
                        comment={reply}
                        currentUserId={user?.id}
                        currentUserRole={user?.role}
                        onDelete={() => deleteComment(reply.id)}
                        renderBody={renderBody}
                        formatDate={formatDate}
                        isReply
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Reply input */}
              {replyingTo === comment.id && user && (
                <div className="ml-8 mt-2 pl-4" style={{ borderLeft: "2px solid #DC3900" }}>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#DC3900]/40"
                    style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#11181C" }}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={() => submitComment(replyText, comment.id)}
                      disabled={!replyText.trim() || submitting}
                      className="px-3 py-1 text-[10px] text-white rounded disabled:opacity-50"
                      style={{ background: "#DC3900" }}
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => { setReplyingTo(null); setReplyText(""); }}
                      className="px-3 py-1 text-[10px] rounded"
                      style={{ color: "#71717A" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentCard({
  comment,
  currentUserId,
  currentUserRole,
  onReply,
  onDelete,
  renderBody,
  formatDate,
  isReply,
}: {
  comment: Comment;
  currentUserId?: number;
  currentUserRole?: string;
  onReply?: () => void;
  onDelete: () => void;
  renderBody: (text: string) => React.ReactNode;
  formatDate: (d: string) => string;
  isReply?: boolean;
}) {
  const canDelete = currentUserId === comment.userId || currentUserRole === "admin";
  const initial = (comment.userName || comment.userEmail || "?")[0].toUpperCase();

  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "white", border: "1px solid rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
          style={{ background: comment.userRole === "admin" ? "#DC3900" : "#71717A" }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium" style={{ color: "#11181C" }}>
              {comment.userName || comment.userEmail}
            </span>
            {comment.userRole === "admin" && (
              <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: "rgba(220,57,0,0.1)", color: "#DC3900" }}>
                admin
              </span>
            )}
            <span className="text-[10px]" style={{ color: "#A1A1AA" }}>
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <div className="text-sm leading-relaxed" style={{ color: "#11181C" }}>
            {renderBody(comment.body)}
          </div>
          <div className="flex gap-3 mt-1.5">
            {onReply && (
              <button
                onClick={onReply}
                className="text-[10px] font-medium transition-colors"
                style={{ color: "#71717A" }}
              >
                Reply
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="text-[10px] transition-colors"
                style={{ color: "#A1A1AA" }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
