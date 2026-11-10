
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ADMIN_ID = "128968c8-eea9-44f7-be54-2c32cab65e30";

type Topic = {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  description: string;
};

type Article = {
  id: string;
  title: string;
  slug: string;
  status: string;
  created_at: string;
};

function ManageTopicsContent() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.categoryId as string;

  const [supabase] = useState(() => createClient());

  const [categoryName, setCategoryName] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);
  const [articlesByTopic, setArticlesByTopic] = useState<
    Record<string, Article[]>
  >({});
  const [loadingArticles, setLoadingArticles] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data: authData } = await supabase.auth.getUser();

      if (authData.user?.id !== ADMIN_ID) {
        router.replace("/admin/login");
        return;
      }

      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .select("name")
        .eq("id", categoryId)
        .single();

      if (categoryError) {
        setError("Unable to load category.");
        setLoading(false);
        return;
      }

      setCategoryName(category.name);

      const { data, error: topicsError } = await supabase
        .from("topics")
        .select("id, category_id, title, slug, description")
        .eq("category_id", categoryId)
        .order("title");

      if (topicsError) {
        setError("Unable to load topics.");
      } else {
        setTopics(data ?? []);
      }

      setLoading(false);
    }

    loadData();
  }, [categoryId, router, supabase]);

  function createSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function resetForm() {
    setTitle("");
    setDescription("");
  }

  function resetEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  }

  function startEditing(topic: Topic) {
    setEditingId(topic.id);
    setEditTitle(topic.title);
    setEditDescription(topic.description ?? "");
  }

  async function saveTopic() {
    if (!title.trim()) {
      alert("Please enter a topic title.");
      return;
    }

    setSaving(true);

    const { error: saveError } = await supabase
      .from("topics")
      .insert({
        title: title.trim(),
        slug: createSlug(title),
        description: description.trim(),
        category_id: categoryId,
      });

    if (saveError) {
      console.error("Add topic error:", saveError);
      alert("Unable to add topic. Check whether the topic title already exists.");
      setSaving(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("topics")
      .select("id, category_id, title, slug, description")
      .eq("category_id", categoryId)
      .order("title");

    if (fetchError) {
      alert("Topic added, but the list could not be refreshed.");
    } else {
      setTopics(data ?? []);
    }

    resetForm();
    setSaving(false);
  }

  async function updateTopic(topicId: string) {
    if (!editTitle.trim()) {
      alert("Please enter a topic title.");
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase
      .from("topics")
      .update({
        title: editTitle.trim(),
        slug: createSlug(editTitle),
        description: editDescription.trim(),
      })
      .eq("id", topicId);

    if (updateError) {
      console.error("Update topic error:", updateError);
      alert("Unable to update topic. Check whether the topic title already exists.");
      setSaving(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("topics")
      .select("id, category_id, title, slug, description")
      .eq("category_id", categoryId)
      .order("title");

    if (fetchError) {
      alert("Topic updated, but the list could not be refreshed.");
    } else {
      setTopics(data ?? []);
    }

    resetEdit();
    setSaving(false);
  }

  async function toggleArticles(topicId: string) {
    // Collapse the article list if it is already expanded.
    if (expandedTopics.includes(topicId)) {
      setExpandedTopics((previous) =>
        previous.filter((id) => id !== topicId)
      );
      return;
    }

    // Expand the topic.
    setExpandedTopics((previous) => [...previous, topicId]);

    // Use previously fetched articles if available.
    if (articlesByTopic[topicId] !== undefined) {
      return;
    }

    setLoadingArticles((previous) => [...previous, topicId]);

    const { data, error: articlesError } = await supabase
      .from("articles")
      .select("id, title, slug, status, created_at")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false });

    if (articlesError) {
      console.error("Fetch articles error:", articlesError);
      alert("Unable to load articles for this topic.");

      setExpandedTopics((previous) =>
        previous.filter((id) => id !== topicId)
      );
    } else {
      setArticlesByTopic((previous) => ({
        ...previous,
        [topicId]: data ?? [],
      }));
    }

    setLoadingArticles((previous) =>
      previous.filter((id) => id !== topicId)
    );
  }

  async function deleteTopic(topicId: string) {
    const confirmed = window.confirm(
      "Delete this topic permanently? This action cannot be undone."
    );

    if (!confirmed) return;

    const { data: relatedArticles, error: checkError } = await supabase
      .from("articles")
      .select("id")
      .eq("topic_id", topicId)
      .limit(1);

    if (checkError) {
      alert("Unable to check whether articles use this topic.");
      return;
    }

    if (relatedArticles && relatedArticles.length > 0) {
      alert(
        "This topic has articles associated with it. Move or delete those articles before deleting the topic."
      );
      return;
    }

    const { error: deleteError } = await supabase
      .from("topics")
      .delete()
      .eq("id", topicId);

    if (deleteError) {
      console.error("Delete topic error:", deleteError);
      alert("Unable to delete topic.");
      return;
    }

    setTopics((previous) =>
      previous.filter((topic) => topic.id !== topicId)
    );

    if (editingId === topicId) {
      resetEdit();
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white p-8">
        Loading topics...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">

        <Link
          href="/admin/manage"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to Manage Categories
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-2">
          Manage Topics
        </h1>

        <p className="text-gray-400 mb-8">
          Category: {categoryName}
        </p>

        {error && (
          <p className="text-red-400 mb-5">{error}</p>
        )}

        {/* Add New Topic */}
        <div className="border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-5">
            Add New Topic
          </h2>

          <label className="block text-sm text-gray-400 mb-2">
            Topic Title
          </label>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Database Indexing"
            className="w-full p-3 mb-4 rounded-lg bg-gray-900 border border-gray-700 outline-none focus:border-blue-500"
          />

          <label className="block text-sm text-gray-400 mb-2">
            Description
          </label>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this topic covers..."
            rows={3}
            className="w-full p-3 mb-5 rounded-lg bg-gray-900 border border-gray-700 outline-none focus:border-blue-500"
          />

          <button
            type="button"
            onClick={saveTopic}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add Topic"}
          </button>
        </div>

        {/* Existing Topics */}
        <h2 className="text-xl font-semibold mb-4">
          Existing Topics ({topics.length})
        </h2>

        <div className="space-y-3">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="border border-gray-800 rounded-xl p-5"
            >
              {editingId === topic.id ? (
                /* Inline Edit */
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Topic Title
                  </label>

                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full p-3 mb-4 rounded-lg bg-gray-900 border border-gray-700 outline-none focus:border-blue-500"
                  />

                  <label className="block text-sm text-gray-400 mb-2">
                    Description
                  </label>

                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full p-3 mb-4 rounded-lg bg-gray-900 border border-gray-700 outline-none focus:border-blue-500"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateTopic(topic.id)}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>

                    <button
                      type="button"
                      onClick={resetEdit}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal Topic View */
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold">
                        📄 {topic.title}
                      </h3>

                      {topic.description && (
                        <p className="text-sm text-gray-400 mt-1">
                          {topic.description}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => toggleArticles(topic.id)}
                        className="px-3 py-2 rounded-lg border border-blue-800 text-blue-400 hover:bg-blue-950 text-sm"
                      >
                        {expandedTopics.includes(topic.id)
                          ? "Hide Articles"
                          : "Show Articles"}
                      </button>

                      <button
                        type="button"
                        onClick={() => startEditing(topic)}
                        className="px-3 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 text-sm"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteTopic(topic.id)}
                        className="px-3 py-2 rounded-lg border border-red-800 text-red-400 hover:bg-red-950 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Articles associated with this topic */}
                  {expandedTopics.includes(topic.id) && (
                    <div className="mt-5 pt-4 border-t border-gray-800">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">
                        Articles associated with this topic
                      </h4>

                      {loadingArticles.includes(topic.id) ? (
                        <p className="text-sm text-gray-400">
                          Loading articles...
                        </p>
                      ) : articlesByTopic[topic.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {articlesByTopic[topic.id].map((article) => (
                            <div
                              key={article.id}
                              className="flex items-center justify-between gap-3 rounded-lg bg-gray-900 border border-gray-800 p-3"
                            >
                              <div className="min-w-0">
                               {article.status === "published" ? (
                                  <Link
                                    href={`/articles/${article.slug}`}
                                    className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
                                  >
                                    {article.title}
                                  </Link>
                                ) : (
                                  <p className="text-sm font-medium text-white">
                                    {article.title}
                                    <span className="text-xs text-yellow-400 ml-2">
                                      (Draft)
                                    </span>
                                  </p>
                                )}

                                <p className="text-xs text-gray-500 mt-1">
                                  Created:{" "}
                                  {new Date(article.created_at).toLocaleDateString()}
                                </p>
                              </div>

                              <span
                                className={`text-xs px-2 py-1 rounded-md shrink-0 ${
                                  article.status === "published"
                                    ? "bg-green-950 text-green-400"
                                    : "bg-yellow-950 text-yellow-400"
                                }`}
                              >
                                {article.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No articles associated with this topic.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {topics.length === 0 && (
            <p className="text-gray-500">
              No topics in this category yet.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ManageTopicsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-950 text-white p-8">
          Loading topic manager...
        </main>
      }
    >
      <ManageTopicsContent />
    </Suspense>
  );
}
