
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Bookmark = {
  id: string;
  article_id: string;
  created_at: string;
  article: {
    id: string;
    title: string;
    description: string | null;
    user_id: string;
    created_at: string;
  } | null;
};

type PublicProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type BookmarkItem = {
  id: string;
  article_id: string;
  bookmarked_at: string;
  article: NonNullable<Bookmark["article"]>;
  author: PublicProfile | null;
};

export default function BookmarksPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: bookmarkData, error: bookmarkError } = await supabase
        .from("article_bookmarks")
        .select("id, article_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bookmarkError) throw bookmarkError;

      const loadedBookmarks = (bookmarkData ?? []) as Omit<
        Bookmark,
        "article"
      >[];

      if (loadedBookmarks.length === 0) {
        setBookmarks([]);
        return;
      }

      const articleIds = [
        ...new Set(loadedBookmarks.map((bookmark) => bookmark.article_id)),
      ];

      const { data: articleData, error: articleError } = await supabase
        .from("user_articles")
        .select("id, title, description, user_id, created_at")
        .in("id", articleIds)
        .eq("status", "published")
        .eq("visibility", "public");

      if (articleError) throw articleError;

      const articles = articleData ?? [];
      const authorIds = [
        ...new Set(articles.map((article) => article.user_id)),
      ];

      let profileMap = new Map<string, PublicProfile>();

      if (authorIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", authorIds);

        if (profileError) throw profileError;

        profileMap = new Map(
          (profileData ?? []).map((profile) => [
            profile.id,
            profile as PublicProfile,
          ])
        );
      }

      const articleMap = new Map(
        articles.map((article) => [article.id, article])
      );

      const items: BookmarkItem[] = loadedBookmarks.flatMap((bookmark) => {
        const article = articleMap.get(bookmark.article_id);

        // Hide articles that are no longer publicly available.
        if (!article) return [];

        return [
          {
            id: bookmark.id,
            article_id: bookmark.article_id,
            bookmarked_at: bookmark.created_at,
            article,
            author: profileMap.get(article.user_id) ?? null,
          },
        ];
      });

      setBookmarks(items);
    } catch (err) {
      console.error("Bookmark loading error:", err);
      setError("Unable to load your bookmarks. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  async function removeBookmark(bookmarkId: string) {
    const confirmed = window.confirm(
      "Remove this article from your bookmarks?"
    );

    if (!confirmed) return;

    setRemovingId(bookmarkId);

    try {
      const { error: deleteError } = await supabase
        .from("article_bookmarks")
        .delete()
        .eq("id", bookmarkId);

      if (deleteError) throw deleteError;

      setBookmarks((current) =>
        current.filter((bookmark) => bookmark.id !== bookmarkId)
      );
    } catch (err) {
      console.error("Bookmark removal error:", err);
      alert("Unable to remove bookmark. Please try again.");
    } finally {
      setRemovingId(null);
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
            <Link
              href="/community"
              className="text-gray-300 hover:text-white"
            >
              Community
            </Link>

            <Link
              href="/my-space"
              className="text-gray-300 hover:text-white"
            >
              My Space
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <Link
            href="/my-space"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to My Space
          </Link>

          <h1 className="mt-5 text-3xl font-bold">My Bookmarks</h1>

          <p className="mt-2 text-gray-400">
            Articles you've saved from the community.
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">
            Loading your bookmarks...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-800 bg-red-950/30 p-6">
            <p className="text-red-300">{error}</p>

            <button
              onClick={loadBookmarks}
              className="mt-4 text-sm text-blue-400 hover:text-blue-300"
            >
              Try again
            </button>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/50 px-6 py-16 text-center">
            <div className="text-4xl">🔖</div>

            <h2 className="mt-4 text-xl font-semibold">
              No bookmarks yet
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Browse Community and bookmark articles you'd like to read later.
            </p>

            <Link
              href="/community"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
            >
              Explore Community
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 text-sm text-gray-500">
              {bookmarks.length} saved{" "}
              {bookmarks.length === 1 ? "article" : "articles"}
            </div>

            <div className="space-y-4">
              {bookmarks.map((bookmark) => (
                <article
                  key={bookmark.id}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-6"
                >
                  <div className="flex flex-col justify-between gap-5 sm:flex-row">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/community/articles/${bookmark.article_id}`}
                        className="text-xl font-semibold hover:text-blue-400"
                      >
                        {bookmark.article.title}
                      </Link>

                      {bookmark.article.description && (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
                          {bookmark.article.description}
                        </p>
                      )}

                      {bookmark.author && (
                        <Link
                          href={`/users/${encodeURIComponent(
                            bookmark.author.username
                          )}`}
                          className="mt-4 inline-flex items-center gap-3 hover:text-blue-400"
                        >
                          {bookmark.author.avatar_url ? (
                            <img
                              src={bookmark.author.avatar_url}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-sm font-semibold">
                              {bookmark.author.display_name
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}

                          <div>
                            <p className="text-sm font-medium">
                              {bookmark.author.display_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              @{bookmark.author.username}
                            </p>
                          </div>
                        </Link>
                      )}

                      <p className="mt-3 text-xs text-gray-500">
                        Bookmarked on{" "}
                        {new Date(
                          bookmark.bookmarked_at
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-start gap-3">
                      <Link
                        href={`/community/articles/${bookmark.article_id}`}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
                      >
                        Read article
                      </Link>

                      <button
                        onClick={() => removeBookmark(bookmark.id)}
                        disabled={removingId === bookmark.id}
                        className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:border-red-500 hover:text-red-400 disabled:opacity-50"
                      >
                        {removingId === bookmark.id
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
