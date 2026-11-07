
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";

const ArticleEditor = dynamic(
  () => import("@/components/ArticleEditor"),
  {
    ssr: false,
    loading: () => (
      <p className="text-gray-400">Loading editor...</p>
    ),
  }
);

type Category = {
  id: string;
  name: string;
};

type Topic = {
  id: string;
  title: string;
  category_id: string;
};

export default function NewArticlePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<object | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [topicId, setTopicId] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error">("success");

  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  useEffect(() => {
    async function fetchData() {
      const [categoryResult, topicResult] = await Promise.all([
        supabase.from("categories").select("id, name"),
        supabase.from("topics").select("id, title, category_id"),
      ]);

      if (categoryResult.error || topicResult.error) {
        console.error(categoryResult.error || topicResult.error);
        setMessage("Could not load categories and topics.");
        setMessageType("error");
        setLoading(false);
        return;
      }

      const categoryData = categoryResult.data ?? [];
      const topicData = topicResult.data ?? [];

      setCategories(categoryData);
      setTopics(topicData);

      // Read category and topic IDs passed from the topic page.
      const queryParams = new URLSearchParams(window.location.search);
      const requestedCategoryId = queryParams.get("categoryId");
      const requestedTopicId = queryParams.get("topicId");

      const requestedTopic = topicData.find(
        (topic) =>
          topic.id === requestedTopicId &&
          topic.category_id === requestedCategoryId
      );

      const requestedCategoryExists = categoryData.some(
        (category) => category.id === requestedCategoryId
      );

      if (requestedTopic && requestedCategoryExists) {
        setCategoryId(requestedCategoryId!);
        setTopicId(requestedTopic.id);
      }

      setLoading(false);
    }

    fetchData();
  }, [supabase]);

  const filteredTopics = topics.filter(
    (topic) => topic.category_id === categoryId
  );

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage("Logout failed: " + error.message);
      setMessageType("error");
      return;
    }

    router.replace("/admin/login");
    router.refresh();
  }

  async function saveArticle(status: "draft" | "published") {
    setMessage("");

    if (!title.trim()) {
      setMessage("Please enter an article title.");
      setMessageType("error");
      return;
    }

    if (!slug) {
      setMessage("Please enter a valid article title.");
      setMessageType("error");
      return;
    }

    if (!categoryId || !topicId) {
      setMessage("Please select a category and topic.");
      setMessageType("error");
      return;
    }

    const selectedTopic = topics.find(
      (topic) =>
        topic.id === topicId &&
        topic.category_id === categoryId
    );

    if (!selectedTopic) {
      setMessage("Please select a valid topic for this category.");
      setMessageType("error");
      return;
    }

    if (!content) {
      setMessage("The editor is still loading. Please try again.");
      setMessageType("error");
      return;
    }

    setSaving(true);

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Your session has expired. Please log in again.");
      setMessageType("error");
      setSaving(false);
      router.replace("/admin/login");
      return;
    }

    const { error } = await supabase
      .from("articles")
      .insert({
        title: title.trim(),
        slug,
        topic_id: topicId,
        content,
        status,
      });

    setSaving(false);

    if (error) {
      console.error("Article save failed:", error);

      if (error.code === "23505") {
        setMessage("This URL slug already exists. Please change the title.");
      } else if (error.code === "42501") {
        setMessage("Permission denied. Check your admin RLS policies.");
      } else {
        setMessage("Could not save article: " + error.message);
      }

      setMessageType("error");
      return;
    }

    setMessage(
      status === "draft"
        ? "Article saved successfully as a draft!"
        : "Article published successfully!"
    );
    setMessageType("success");

    if (status === "published") {
      setTimeout(() => {
        router.push(`/articles/${slug}`);
      }, 1200);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="h-16 border-b border-gray-800 flex items-center px-6">
        <Link href="/" className="text-xl font-bold">
          System Design Hub
        </Link>

        <div className="ml-auto flex items-center gap-5">
          <span className="text-gray-400 text-sm">
            Create Article
          </span>

          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/articles" className="text-blue-400 text-sm">
          ← Back to articles
        </Link>

        <h1 className="text-3xl font-bold mt-8 mb-2">
          Create a new article
        </h1>

        <p className="text-gray-400 mb-8">
          Write and organize your system design knowledge.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm mb-2">
              Article title
            </label>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Designing a Scalable YouTube Architecture"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500"
            />

            <p className="mt-2 text-sm text-gray-400">
              URL slug:{" "}
              <span className="text-blue-400">
                {slug || "your-article-slug"}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm mb-2">
                Category
              </label>

              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setTopicId("");
                }}
                disabled={loading}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"
              >
                <option value="">
                  {loading ? "Loading..." : "Select category"}
                </option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2">
                Topic
              </label>

              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                disabled={!categoryId || loading}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"
              >
                <option value="">Select topic</option>

                {filteredTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {topicId && (
            <p className="text-sm text-green-400">
              This article will be added to the selected topic.
            </p>
          )}

          <div>
            <label className="block text-sm mb-3">
              Article content
            </label>

            <ArticleEditor onChange={setContent} />
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg text-sm ${
                messageType === "success"
                  ? "bg-green-900/40 text-green-300 border border-green-800"
                  : "bg-red-900/40 text-red-300 border border-red-800"
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-800 pt-6">
            <button
              type="button"
              onClick={() => router.push("/articles")}
              className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => saveArticle("draft")}
              disabled={saving || loading}
              className="px-5 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={() => saveArticle("published")}
              disabled={saving || loading}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Publish Article"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
