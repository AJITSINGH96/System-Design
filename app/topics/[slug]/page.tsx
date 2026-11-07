
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Topic = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category_id: string;
};

type Category = {
  name: string;
};

type Article = {
  id: string;
  title: string;
  slug: string;
  created_at: string;
};

function TopicContent() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [topic, setTopic] = useState<Topic | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTopicData() {
      try {
        setLoading(true);
        setError("");

        const { data: topicData, error: topicError } =
          await supabase
            .from("topics")
            .select("id, title, slug, description, category_id")
            .eq("slug", slug)
            .single();

        if (topicError) throw topicError;

        setTopic(topicData);

        const { data: categoryData, error: categoryError } =
          await supabase
            .from("categories")
            .select("name")
            .eq("id", topicData.category_id)
            .single();

        if (categoryError) throw categoryError;

        setCategory(categoryData);

        const { data: articleData, error: articleError } =
          await supabase
            .from("articles")
            .select("id, title, slug, created_at")
            .eq("topic_id", topicData.id)
            .eq("status", "published")
            .order("created_at", { ascending: false });

        if (articleError) throw articleError;

        setArticles(articleData ?? []);
      } catch (err) {
        console.error("Topic data error:", err);
        setError("Unable to load this topic.");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchTopicData();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-10">
        Loading topic...
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-10">
        <p className="text-red-400">
          {error || "Topic not found."}
        </p>
        <Link href="/" className="text-blue-400 mt-4 inline-block">
          Back to home
        </Link>
      </div>
    );
  }

  const createArticleUrl =
    `/admin/articles/new?categoryId=${encodeURIComponent(topic.category_id)}` +
    `&topicId=${encodeURIComponent(topic.id)}`;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="h-16 border-b border-gray-800 flex items-center px-6">
        <Link href="/" className="text-xl font-bold">
          System Design Hub
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
       <Link
            href={`/?category=${topic.category_id}`}
            className="text-blue-400 hover:text-blue-300 text-sm"
            >
            ← Back to topics
            </Link>

        <p className="text-blue-400 text-sm mt-10 mb-3">
          {category?.name.toUpperCase()}
        </p>

        <h1 className="text-4xl font-bold mb-5">
          {topic.title}
        </h1>

        <p className="text-gray-400 text-lg mb-10">
          {topic.description}
        </p>

        <article className="border-t border-gray-800 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-semibold">
              Published Articles
            </h2>

            <Link
              href={createArticleUrl}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
            >
              + Create Article
            </Link>
          </div>

          {articles.length === 0 ? (
            <p className="text-gray-400 leading-8">
              No articles have been published for this topic yet.
            </p>
          ) : (
            <div className="space-y-3">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.slug}`}
                  className="block border border-gray-800 rounded-xl p-5 hover:border-blue-500 transition"
                >
                  <h3 className="font-semibold text-lg">
                    {article.title}
                  </h3>

                  <p className="text-gray-500 text-sm mt-2">
                    Published{" "}
                    {new Date(article.created_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </article>
      </main>
    </div>
  );
}

export default function TopicPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 text-gray-100 p-10">
          Loading topic...
        </div>
      }
    >
      <TopicContent />
    </Suspense>
  );
}
