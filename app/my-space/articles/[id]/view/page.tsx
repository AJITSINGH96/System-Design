
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { JSONContent } from "@tiptap/core";

import { createClient } from "@/lib/supabase/client";
import ArticleViewer from "@/components/ArticleViewer";

type Article = {
  id: string;
  title: string;
  description: string | null;
  content: JSONContent;
  status: string;
  visibility: string;
  updated_at: string;
};

function ViewMyArticleContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [supabase] = useState(() => createClient());
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadArticle() {
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
            "id, title, description, content, status, visibility, updated_at"
          )
          .eq("id", params.id)
          .eq("user_id", user.id)
          .single();

        if (queryError) throw queryError;

        setArticle(data as Article);
      } catch (err) {
        console.error("Article loading error:", err);
        setError(
          "Unable to load this article. It may not exist or you may not have access."
        );
      } finally {
        setLoading(false);
      }
    }

    loadArticle();
  }, [params.id, router, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
        Loading article...
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-6 text-gray-300">
        <p className="text-red-400">
          {error || "Article not found."}
        </p>

        <Link
          href="/my-space/articles"
          className="mt-5 text-blue-400 hover:text-blue-300"
        >
          ← Back to My Articles
        </Link>
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

      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/my-space/articles"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to My Articles
        </Link>

        <div className="mt-8">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-800 px-3 py-1 text-xs capitalize text-gray-300">
              {article.status}
            </span>

            <span className="rounded-full bg-gray-800 px-3 py-1 text-xs capitalize text-gray-300">
              {article.visibility}
            </span>
          </div>

          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            {article.title}
          </h1>

          {article.description && (
            <p className="mt-4 text-lg leading-7 text-gray-400">
              {article.description}
            </p>
          )}

          <p className="mt-4 text-xs text-gray-500">
            Last updated{" "}
            {new Date(article.updated_at).toLocaleDateString()}
          </p>

          <div className="my-8 border-t border-gray-800" />

          <ArticleViewer content={article.content} />

          <div className="mt-12 border-t border-gray-800 pt-6">
            <Link
              href={`/my-space/articles/${article.id}/edit`}
              className="inline-block rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-700"
            >
              Edit Article
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ViewMyArticlePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
          Loading article...
        </div>
      }
    >
      <ViewMyArticleContent />
    </Suspense>
  );
}
