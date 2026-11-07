
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { JSONContent } from "@tiptap/core";
import { supabase } from "@/lib/supabase";

const ArticleViewer = dynamic(
  () => import("@/components/ArticleViewer"),
  {
    ssr: false,
    loading: () => (
      <p className="text-gray-400">Loading article...</p>
    ),
  }
);

type Article = {
  id: string;
  title: string;
  slug: string;
  content: JSONContent;
  created_at: string;
};

function ArticleContent() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchArticle() {
      try {
        setLoading(true);
        setError("");

        const { data, error } = await supabase
          .from("articles")
          .select("id, title, slug, content, created_at")
          .eq("slug", slug)
          .eq("status", "published")
          .single();

        if (error) throw error;

        setArticle(data as Article);
      } catch (err) {
        console.error("Article fetch error:", err);
        setError("Unable to load this article.");
      } finally {
        setLoading(false);
      }
    }

    fetchArticle();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 p-10">
        Loading article...
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 p-10">
        <p className="text-red-400">
          {error || "Article not found."}
        </p>

        <Link href="/" className="text-blue-400 mt-4 inline-block">
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="h-16 border-b border-gray-800 flex items-center px-6">
        <Link href="/" className="text-xl font-bold">
          System Design Hub
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to home
        </Link>

        <p className="text-gray-500 text-sm mt-10 mb-4">
          Published{" "}
          {new Date(article.created_at).toLocaleDateString()}
        </p>

        <h1 className="text-4xl font-bold mb-8">
          {article.title}
        </h1>

        <article className="border-t border-gray-800 pt-8">
          {article.content ? (
            <ArticleViewer content={article.content} />
          ) : (
            <p className="text-gray-400">
              Article content is not available.
            </p>
          )}
        </article>
      </main>
    </div>
  );
}

export default function ArticlePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-950 text-gray-100 p-10">
          Loading article...
        </main>
      }
    >
      <ArticleContent />
    </Suspense>
  );
}
