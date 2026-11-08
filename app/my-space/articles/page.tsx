
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Article = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  visibility: string;
  updated_at: string;
};

export default function MyArticlesPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error: queryError } = await supabase
        .from("user_articles")
        .select(
          "id, title, slug, description, status, visibility, updated_at"
        )
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (queryError) throw queryError;

      setArticles(data ?? []);
    } catch (err) {
      console.error("Articles loading error:", err);
      setError("Unable to load your articles. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  async function handleDelete(articleId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this article?"
    );

    if (!confirmed) return;

    setDeletingId(articleId);
    setError("");
    setMessage("");

    try {
      const { error: deleteError } = await supabase
        .from("user_articles")
        .delete()
        .eq("id", articleId);

      if (deleteError) throw deleteError;

      setMessage("Article deleted successfully.");
      await loadArticles();
    } catch (err) {
      console.error("Article deletion error:", err);
      setError("Unable to delete this article. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
        Loading your articles...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            System Design <span className="text-blue-400">Hub</span>
          </Link>

          <Link
            href="/my-space"
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800"
          >
            My Space
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/my-space"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to My Space
        </Link>

        <div className="mb-8 mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-400">
              PERSONAL WORKSPACE
            </p>
            <h1 className="mt-2 text-3xl font-bold">My Articles</h1>
            <p className="mt-2 text-gray-400">
              Manage your personal system design articles.
            </p>
          </div>

          <Link
            href="/my-space/articles/new"
            className="rounded-lg bg-blue-600 px-5 py-3 text-center text-sm font-semibold hover:bg-blue-700"
          >
            + Create Article
          </Link>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-lg border border-green-800 bg-green-950/30 p-4 text-sm text-green-300">
            {message}
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your articles</h2>
          <span className="text-sm text-gray-500">
            {articles.length} articles
          </span>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/50 px-6 py-14 text-center">
            <div className="text-4xl">📝</div>
            <h3 className="mt-4 text-lg font-semibold">No articles yet</h3>
            <p className="mt-2 text-sm text-gray-400">
              Create your first personal article.
            </p>
            <Link
              href="/my-space/articles/new"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-700"
            >
              Create your first article
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <div
                key={article.id}
                className="rounded-xl border border-gray-800 bg-gray-900 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{article.title}</h3>

                    {article.description && (
                      <p className="mt-1 text-sm text-gray-400">
                        {article.description}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-gray-500">
                      Updated{" "}
                      {new Date(article.updated_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-800 px-3 py-1 text-xs capitalize text-gray-300">
                      {article.status}
                    </span>

                    <span className="rounded-full bg-gray-800 px-3 py-1 text-xs capitalize text-gray-300">
                      {article.visibility}
                    </span>

                    <Link
                      href={`/my-space/articles/${article.id}/edit`}
                      className="rounded-lg border border-blue-800 px-3 py-2 text-xs text-blue-400 hover:bg-blue-950/50"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() => handleDelete(article.id)}
                      disabled={deletingId === article.id}
                      className="rounded-lg border border-red-900 px-3 py-2 text-xs text-red-400 hover:bg-red-950/50 disabled:opacity-50"
                    >
                      {deletingId === article.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
