
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
    setEditingId(null);
  }

  function startEditing(topic: Topic) {
    setEditingId(topic.id);
    setTitle(topic.title);
    setDescription(topic.description ?? "");
  }

  async function saveTopic() {
    if (!title.trim()) {
      alert("Please enter a topic title.");
      return;
    }

    setSaving(true);

    const values = {
      title: title.trim(),
      slug: createSlug(title),
      description: description.trim(),
      category_id: categoryId,
    };

    const result = editingId
      ? await supabase
          .from("topics")
          .update(values)
          .eq("id", editingId)
      : await supabase.from("topics").insert(values);

    if (result.error) {
      console.error("Save topic error:", result.error);
      alert("Unable to save topic. Check whether the topic title already exists.");
      setSaving(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("topics")
      .select("id, category_id, title, slug, description")
      .eq("category_id", categoryId)
      .order("title");

    if (fetchError) {
      alert("Topic saved, but the list could not be refreshed.");
    } else {
      setTopics(data ?? []);
    }

    resetForm();
    setSaving(false);
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
      resetForm();
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
          href="/"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to Home
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

        {/* Add / Edit Topic Form */}
        <div className="border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-5">
            {editingId ? "Edit Topic" : "Add New Topic"}
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

          <div className="flex gap-3">
            <button
              onClick={saveTopic}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Topic"
                  : "Add Topic"}
            </button>

            {editingId && (
              <button
                onClick={resetForm}
                className="px-5 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Existing Topics */}
        <h2 className="text-xl font-semibold mb-4">
          Existing Topics ({topics.length})
        </h2>

        <div className="space-y-3">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="flex items-center justify-between gap-4 border border-gray-800 rounded-xl p-5"
            >
              <div className="min-w-0">
                <h3 className="font-semibold">
                📄 {topic.title}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {topic.description}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => startEditing(topic)}
                  className="px-3 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 text-sm"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteTopic(topic.id)}
                  className="px-3 py-2 rounded-lg border border-red-800 text-red-400 hover:bg-red-950 text-sm"
                >
                  Delete
                </button>
              </div>
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
