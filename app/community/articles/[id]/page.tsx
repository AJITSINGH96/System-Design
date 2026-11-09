
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { JSONContent } from "@tiptap/core";

import { createClient } from "@/lib/supabase/client";
import ArticleViewer from "@/components/ArticleViewer";

type CommunityArticle = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  content: JSONContent;
  created_at: string;
};

type PublicProfile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
};

type ArticleComment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile: PublicProfile | null;
};

function CommunityArticleContent() {
  const params = useParams<{ id: string }>();
  const articleId = params.id;

  const [supabase] = useState(() => createClient());

  const [article, setArticle] = useState<CommunityArticle | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadInteractions(targetArticleId: string) {
    // Load likes
    const { data: likesData, error: likesError } = await supabase
      .from("article_likes")
      .select("id, user_id")
      .eq("article_id", targetArticleId);

    if (likesError) throw likesError;

    const likes = likesData ?? [];

    setLikeCount(likes.length);
    setHasLiked(
      currentUserId
        ? likes.some((like) => like.user_id === currentUserId)
        : false
    );

    // Load comments
    const { data: commentsData, error: commentsError } = await supabase
      .from("article_comments")
      .select("id, user_id, body, created_at")
      .eq("article_id", targetArticleId)
      .order("created_at", { ascending: true });

    if (commentsError) throw commentsError;

    const loadedComments = commentsData ?? [];

    // Load profiles for comment authors
    const userIds = [
      ...new Set(loadedComments.map((comment) => comment.user_id)),
    ];

    let profilesMap = new Map<string, PublicProfile>();

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("user_profiles")
        .select("id, username, display_name, bio, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      profilesMap = new Map(
        (profilesData ?? []).map((item) => [
          item.id,
          item as PublicProfile,
        ])
      );
    }

    setComments(
      loadedComments.map((comment) => ({
        ...comment,
        profile: profilesMap.get(comment.user_id) ?? null,
      }))
    );
  }

  useEffect(() => {
    async function loadArticle() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setCurrentUserId(user?.id ?? null);
        setIsBookmarked(false);

        const { data: articleData, error: articleError } = await supabase
          .from("user_articles")
          .select("id, user_id, title, description, content, created_at")
          .eq("id", articleId)
          .eq("status", "published")
          .eq("visibility", "public")
          .maybeSingle();

        if (articleError) throw articleError;

        if (!articleData) {
          setArticle(null);
          setError(
            "This article does not exist or is not publicly available."
          );
          return;
        }

        const loadedArticle = articleData as CommunityArticle;
        setArticle(loadedArticle);
        // Check whether the logged-in user has bookmarked this article.
        if (user) {
          const { data: bookmarkData, error: bookmarkError } = await supabase
            .from("article_bookmarks")
            .select("id")
            .eq("article_id", articleId)
            .eq("user_id", user.id)
            .maybeSingle();

          if (bookmarkError) throw bookmarkError;

          setIsBookmarked(Boolean(bookmarkData));
        }

        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("id, username, display_name, bio, avatar_url")
          .eq("id", loadedArticle.user_id)
          .maybeSingle();

        if (profileError) throw profileError;

        setProfile(profileData as PublicProfile | null);

        // Load likes and comments after identifying the logged-in user
        const { data: likesData, error: likesError } = await supabase
          .from("article_likes")
          .select("id, user_id")
          .eq("article_id", articleId);

        if (likesError) throw likesError;

        const likes = likesData ?? [];
        setLikeCount(likes.length);
        setHasLiked(
          user ? likes.some((like) => like.user_id === user.id) : false
        );

        const { data: commentsData, error: commentsError } = await supabase
          .from("article_comments")
          .select("id, user_id, body, created_at")
          .eq("article_id", articleId)
          .order("created_at", { ascending: true });

        if (commentsError) throw commentsError;

        const loadedComments = commentsData ?? [];
        const userIds = [
          ...new Set(loadedComments.map((comment) => comment.user_id)),
        ];

        let profilesMap = new Map<string, PublicProfile>();

        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("user_profiles")
            .select("id, username, display_name, bio, avatar_url")
            .in("id", userIds);

          if (profilesError) throw profilesError;

          profilesMap = new Map(
            (profilesData ?? []).map((item) => [
              item.id,
              item as PublicProfile,
            ])
          );
        }

        setComments(
          loadedComments.map((comment) => ({
            ...comment,
            profile: profilesMap.get(comment.user_id) ?? null,
          }))
        );
      } catch (err) {
        console.error("Article loading error:", err);
        setError("Unable to load this article. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (articleId) {
      loadArticle();
    }
  }, [articleId, supabase]);

  async function handleLike() {
    if (!currentUserId || !article) return;

    setLikeLoading(true);

    try {
      if (hasLiked) {
        const { error: deleteError } = await supabase
          .from("article_likes")
          .delete()
          .eq("article_id", article.id)
          .eq("user_id", currentUserId);

        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from("article_likes")
          .insert({
            article_id: article.id,
            user_id: currentUserId,
          });

        if (insertError) throw insertError;
      }

      await loadInteractions(article.id);
    } catch (err) {
      console.error("Like update error:", err);
      alert("Unable to update your like. Please try again.");
    } finally {
      setLikeLoading(false);
    }
  }
  async function handleBookmark() {
  if (!currentUserId || !article) return;

  setBookmarkLoading(true);

  try {
    if (isBookmarked) {
      const { error: deleteError } = await supabase
        .from("article_bookmarks")
        .delete()
        .eq("article_id", article.id)
        .eq("user_id", currentUserId);

      if (deleteError) throw deleteError;

      setIsBookmarked(false);
    } else {
      const { error: insertError } = await supabase
        .from("article_bookmarks")
        .insert({
          article_id: article.id,
          user_id: currentUserId,
        });

      if (insertError) throw insertError;

      setIsBookmarked(true);
    }
  } catch (err) {
    console.error("Bookmark update error:", err);
    alert("Unable to update your bookmark. Please try again.");
  } finally {
    setBookmarkLoading(false);
  }
}

  async function handleCommentSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!currentUserId || !article) return;

    const cleanComment = commentText.trim();

    if (!cleanComment) return;

    if (cleanComment.length > 2000) {
      setCommentError("Comments cannot exceed 2000 characters.");
      return;
    }

    setCommentLoading(true);
    setCommentError("");

    try {
      const { error: insertError } = await supabase
        .from("article_comments")
        .insert({
          article_id: article.id,
          user_id: currentUserId,
          body: cleanComment,
        });

      if (insertError) throw insertError;

      setCommentText("");
      await loadInteractions(article.id);
    } catch (err) {
      console.error("Comment submission error:", err);
      setCommentError("Unable to post your comment. Please try again.");
    } finally {
      setCommentLoading(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!currentUserId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this comment?"
    );

    if (!confirmed) return;

    try {
      const { error: deleteError } = await supabase
        .from("article_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", currentUserId);

      if (deleteError) throw deleteError;

      if (article) {
        await loadInteractions(article.id);
      }
    } catch (err) {
      console.error("Comment deletion error:", err);
      alert("Unable to delete the comment. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            System Design <span className="text-blue-400">Hub</span>
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <Link href="/articles" className="text-gray-300 hover:text-white">
              Articles
            </Link>

            <Link href="/community" className="text-gray-300 hover:text-white">
              Community
            </Link>

            <Link href="/my-space" className="text-gray-300 hover:text-white">
              My Space
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to Community
        </Link>

        {loading ? (
          <div className="py-20 text-center text-gray-400">
            Loading article...
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
            <h1 className="text-xl font-semibold">Article unavailable</h1>

            <p className="mt-3 text-gray-400">{error}</p>

            <Link
              href="/community"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
            >
              Explore Community
            </Link>
          </div>
        ) : article ? (
          <article className="mt-8">
            <div className="border-b border-gray-800 pb-8">
              <h1 className="text-3xl font-bold leading-tight md:text-4xl">
                {article.title}
              </h1>

              {article.description && (
                <p className="mt-5 text-lg leading-8 text-gray-400">
                  {article.description}
                </p>
              )}

              <div className="mt-7 flex items-center justify-between gap-4">
                {profile ? (
                  <Link
                    href={`/users/${encodeURIComponent(profile.username)}`}
                    className="flex items-center gap-3 hover:text-blue-400"
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-700 font-semibold">
                        {profile.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <p className="font-medium">{profile.display_name}</p>
                      <p className="text-sm text-gray-500">
                        @{profile.username}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <span className="text-sm text-gray-500">
                    Community member
                  </span>
                )}

                <span className="text-sm text-gray-500">
                  {new Date(article.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="py-10">
              <ArticleViewer content={article.content} />
            </div>

            {/* Bookmark */}
            <section className="border-b border-gray-800 py-5">
              {currentUserId ? (
                <button
                  type="button"
                  onClick={handleBookmark}
                  disabled={bookmarkLoading}
                  className={`rounded-lg border px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isBookmarked
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-gray-700 text-gray-300 hover:border-blue-500 hover:text-blue-400"
                  }`}
                >
                  {bookmarkLoading
                    ? "Please wait..."
                    : isBookmarked
                      ? "✓ Bookmarked"
                      : "♡ Bookmark"}
                </button>
              ) : (
                <p className="text-sm text-gray-500">
                  <Link
                    href="/login"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Sign in
                  </Link>{" "}
                  to bookmark this article.
                </p>
              )}
</section>
            {/* Likes */}
            <section className="border-y border-gray-800 py-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLike}
                  disabled={!currentUserId || likeLoading}
                  className={`rounded-lg border px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    hasLiked
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-gray-700 text-gray-300 hover:border-blue-500 hover:text-blue-400"
                  }`}
                >
                  {likeLoading
                    ? "Please wait..."
                    : hasLiked
                      ? "♥ Liked"
                      : "♡ Like"}
                </button>

                <span className="text-sm text-gray-400">
                  {likeCount} {likeCount === 1 ? "like" : "likes"}
                </span>
              </div>

              {!currentUserId && (
                <p className="mt-3 text-sm text-gray-500">
                  <Link
                    href="/login"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Sign in
                  </Link>{" "}
                  to like this article.
                </p>
              )}
            </section>

            {/* Comments */}
            <section className="py-10">
              <h2 className="text-2xl font-bold">
                Comments ({comments.length})
              </h2>

              {currentUserId ? (
                <form onSubmit={handleCommentSubmit} className="mt-6">
                  <textarea
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Share your thoughts..."
                    rows={4}
                    maxLength={2000}
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-blue-500"
                  />

                  <div className="mt-3 flex items-center justify-between gap-4">
                    <span className="text-xs text-gray-500">
                      {commentText.length}/2000 characters
                    </span>

                    <button
                      type="submit"
                      disabled={commentLoading || !commentText.trim()}
                      className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {commentLoading ? "Posting..." : "Post Comment"}
                    </button>
                  </div>

                  {commentError && (
                    <p className="mt-3 text-sm text-red-400">
                      {commentError}
                    </p>
                  )}
                </form>
              ) : (
                <p className="mt-4 text-sm text-gray-400">
                  <Link
                    href="/login"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Sign in
                  </Link>{" "}
                  to join the discussion.
                </p>
              )}

              <div className="mt-8 space-y-6">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border-b border-gray-800 pb-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {comment.profile?.avatar_url ? (
                            <img
                              src={comment.profile.avatar_url}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 font-semibold">
                              {(
                                comment.profile?.display_name ?? "U"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}

                          <div>
                            {comment.profile ? (
                              <Link
                                href={`/users/${encodeURIComponent(
                                  comment.profile.username
                                )}`}
                                className="font-medium hover:text-blue-400"
                              >
                                {comment.profile.display_name}
                              </Link>
                            ) : (
                              <p className="font-medium">Community member</p>
                            )}

                            <p className="text-xs text-gray-500">
                              {new Date(
                                comment.created_at
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {currentUserId === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        )}
                      </div>

                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-300">
                        {comment.body}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="border-t border-gray-800 pt-6">
              <Link
                href="/community"
                className="text-sm font-medium text-blue-400 hover:text-blue-300"
              >
                ← Back to Community articles
              </Link>
            </div>
          </article>
        ) : null}
      </main>
    </div>
  );
}

export default function CommunityArticlePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
          Loading article...
        </div>
      }
    >
      <CommunityArticleContent />
    </Suspense>
  );
}
