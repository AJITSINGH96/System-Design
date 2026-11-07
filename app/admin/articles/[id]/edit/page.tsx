
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { JSONContent } from "@tiptap/core";

const ArticleEditor = dynamic(
  () => import("@/components/ArticleEditor"),
  { ssr: false }
);

const ADMIN_ID = "128968c8-eea9-44f7-be54-2c32cab65e30";

type Category = {
  id: string;
  name: string;
};

type Topic = {
  id: string;
  title: string;
  category_id: string;
};

function EditArticleContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [supabase] = useState(() => createClient());

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [content, setContent] = useState<JSONContent | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadArticle() {
      const { data: authData } = await supabase.auth.getUser();

      if (authData.user?.id !== ADMIN_ID) {
        router.replace("/admin/login");
        return;
      }

      const [articleResult, categoriesResult, topicsResult] =
        await Promise.all([
          supabase
            .from("articles")
            .select("id, title, slug, topic_id, content, status")
            .eq("id", id)
            .single(),

          supabase.from("categories").select("id, name"),

          supabase.from("topics").select("id, title, category_id"),
        ]);

      if (articleResult.error || !articleResult.data) {
        console.error(articleResult.error);
        setMessage("Article not found or you don't have permission.");
        setLoading(false);
        return;
      }

      const article = articleResult.data;
      const loadedTopics = (topicsResult.data ?? []) as Topic[];

      const selectedTopic = loadedTopics.find(
        (topic) => topic.id === article.topic_id
      );

      setTitle(article.title);
      setSlug(article.slug);
      setTopicId(article.topic_id);
      setCategoryId(selectedTopic?.category_id ?? "");
      setContent(article.content as JSONContent);
      setStatus(article.status);

      setCategories((categoriesResult.data ?? []) as Category[]);
      setTopics(loadedTopics);

      setLoading(false);
    }

    loadArticle();
  }, [id, router, supabase]);

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function saveArticle(newStatus: "draft" | "published") {
    if (!title.trim() || !categoryId || !topicId || !content) {
      setMessage("Please complete the title, category, topic and content.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { data: authData } = await supabase.auth.getUser();

    if (authData.user?.id !== ADMIN_ID) {
      setMessage("You are not authorized to edit this article.");
      setSaving(false);
      return;
    }

    const finalSlug = generateSlug(title);

    const { error } = await supabase
      .from("articles")
      .update({
        title: title.trim(),
        slug: finalSlug,
        topic_id: topicId,
        content,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error(error);

      setMessage(
        error.code === "23505"
          ? "An article with this title/URL already exists."
          : "Unable to save article. Please try again."
      );

      setSaving(false);
      return;
    }

    setStatus(newStatus);
    setMessage(
      newStatus === "published"
        ? "Article published successfully!"
        : "Draft saved successfully!"
    );

    setSaving(false);

    setTimeout(() => {
      router.push("/articles");
      router.refresh();
    }, 1000);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white p-8">
        Loading article...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push("/articles")}
          className="text-blue-400 hover:text-blue-300 mb-6"
        >
          ← Back to All Articles
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Edit Article</h1>

          <span className="text-sm text-gray-400">
            Current status: {status}
          </span>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm mb-2">Article Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 outline-none"
              placeholder="Enter article title"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Category</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setTopicId("");
              }}
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700"
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2">Topic</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700"
              disabled={!categoryId}
            >
              <option value="">Select Topic</option>
              {topics
                .filter((topic) => topic.category_id === categoryId)
                .map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2">Article Content</label>

            {content && (
              <ArticleEditor
                key={id}
                initialContent={content}
                onChange={setContent}
              />
            )}
          </div>

          {message && (
            <p className="text-sm text-blue-400">{message}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
                type="button"
                onClick={() => router.push("/articles")}
                className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
            >
                Cancel
            </button>
            <button
              onClick={() => saveArticle("draft")}
              disabled={saving}
              className="px-5 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save as Draft"}
            </button>

            <button
              onClick={() => saveArticle("published")}
              disabled={saving}
              className="px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Publish"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function EditArticlePage() {
  return (
    <Suspense fallback={<p className="text-white p-8">Loading...</p>}>
      <EditArticleContent />
    </Suspense>
  );
}
