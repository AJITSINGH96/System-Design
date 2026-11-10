
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
};

type Topic = {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  description: string | null;
  created_at: string;
};

function MyTopicsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read the category ID reactively from the URL.
  const selectedCategoryId = searchParams.get("categoryId") ?? "";

  const [supabase] = useState(() => createClient());

  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    // Clear the previous category's topics immediately.
    setTopics([]);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const [categoryResult, topicResult] = await Promise.all([
        supabase
          .from("user_categories")
          .select("id, name")
          .eq("user_id", user.id)
          .order("name"),

        (() => {
          let query = supabase
            .from("user_topics")
            .select("id, category_id, title, slug, description, created_at")
            .eq("user_id", user.id);

          if (selectedCategoryId) {
            query = query.eq("category_id", selectedCategoryId);
          }

          return query.order("created_at", { ascending: false });
        })(),
      ]);

      if (categoryResult.error) throw categoryResult.error;
      if (topicResult.error) throw topicResult.error;

      setCategories(categoryResult.data ?? []);
      setTopics(topicResult.data ?? []);
    } catch (err) {
      console.error("Topics loading error:", err);
      setError("Unable to load your topics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router, supabase, selectedCategoryId]);

  // Reload whenever the category in the URL changes.
  useEffect(() => {
    loadData();
  }, [loadData]);

  function createSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanTitle = title.trim();
    const selectedId = categoryId || selectedCategoryId;

    if (!cleanTitle || !selectedId) {
      setError("Enter a topic title and select a category.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { error: insertError } = await supabase
        .from("user_topics")
        .insert({
          user_id: user.id,
          category_id: selectedId,
          title: cleanTitle,
          slug: createSlug(cleanTitle),
          description: description.trim() || null,
        });

      if (insertError) throw insertError;

      setTitle("");
      setDescription("");
      setCategoryId("");
      setMessage("Topic created successfully.");

      await loadData();
    } catch (err) {
      console.error("Topic creation error:", err);
      setError("Unable to create topic. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(topicId: string) {
    const cleanTitle = editTitle.trim();

    if (!cleanTitle || !editCategoryId) {
      setError("Enter a topic title and select a category.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: updateError } = await supabase
        .from("user_topics")
        .update({
          title: cleanTitle,
          slug: createSlug(cleanTitle),
          description: editDescription.trim() || null,
          category_id: editCategoryId,
        })
        .eq("id", topicId);

      if (updateError) throw updateError;

      setEditingId(null);
      setMessage("Topic updated successfully.");

      await loadData();
    } catch (err) {
      console.error("Topic update error:", err);
      setError("Unable to update topic. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(topicId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this topic?"
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: deleteError } = await supabase
        .from("user_topics")
        .delete()
        .eq("id", topicId);

      if (deleteError) throw deleteError;

      setMessage("Topic deleted successfully.");
      await loadData();
    } catch (err) {
      console.error("Topic deletion error:", err);
      setError(
        "Unable to delete topic. It may be linked to existing articles."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
        Loading your topics...
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
          href="/my-space/categories"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to My Categories
        </Link>

        <div className="mb-8 mt-6">
          <p className="text-sm font-medium text-blue-400">
            PERSONAL WORKSPACE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {selectedCategory
              ? `${selectedCategory.name} Topics`
              : "My Topics"}
          </h1>

          <p className="mt-2 text-gray-400">
            {selectedCategory
              ? `Manage topics belonging to ${selectedCategory.name}.`
              : "Organize related articles under your personal categories."}
          </p>
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

        <section className="mb-10 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold">Create a new topic</h2>

          {categories.length === 0 ? (
            <div className="mt-4 text-sm text-gray-400">
              Create a category first before adding topics.
              <Link
                href="/my-space/categories"
                className="ml-2 text-blue-400 hover:text-blue-300"
              >
                Go to My Categories →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Topic title, e.g. Load Balancing"
                maxLength={120}
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short description (optional)"
                rows={3}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />

              <select
                value={categoryId || selectedCategoryId || ""}
                onChange={(event) => setCategoryId(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Topic"}
              </button>
            </form>
          )}
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedCategory
                  ? `Topics in ${selectedCategory.name}`
                  : "Your topics"}
              </h2>

              <span className="text-sm text-gray-500">
                {topics.length} topics
              </span>
            </div>

            {selectedCategoryId && (
              <Link
                href="/my-space/topics"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Show all topics →
              </Link>
            )}
          </div>

          {topics.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/50 px-6 py-14 text-center">
              <div className="text-4xl">🗂️</div>
              <h3 className="mt-4 text-lg font-semibold">No topics yet</h3>
              <p className="mt-2 text-sm text-gray-400">
                {selectedCategory
                  ? `There are no topics in ${selectedCategory.name} yet. Create your first topic above.`
                  : "Create your first topic to organize your articles."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topics.map((topic) => {
                const category = categories.find(
                  (item) => item.id === topic.category_id
                );

                return (
                  <div
                    key={topic.id}
                    className="rounded-xl border border-gray-800 bg-gray-900 p-5"
                  >
                    {editingId === topic.id ? (
                      <div className="space-y-3">
                        <input
                          value={editTitle}
                          onChange={(event) =>
                            setEditTitle(event.target.value)
                          }
                          maxLength={120}
                          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 outline-none focus:border-blue-500"
                        />

                        <textarea
                          value={editDescription}
                          onChange={(event) =>
                            setEditDescription(event.target.value)
                          }
                          rows={3}
                          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 outline-none focus:border-blue-500"
                        />

                        <select
                          value={editCategoryId}
                          onChange={(event) =>
                            setEditCategoryId(event.target.value)
                          }
                          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 outline-none focus:border-blue-500"
                        >
                          {categories.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(topic.id)}
                            disabled={saving}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
                          >
                            Save
                          </button>

                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-semibold">📄{topic.title}</h3>

                          <p className="mt-1 text-xs text-blue-400">
                            {category?.name ?? "Category unavailable"}
                          </p>

                          {topic.description && (
                            <p className="mt-2 text-sm text-gray-400">
                              {topic.description}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(topic.id);
                              setEditTitle(topic.title);
                              setEditDescription(topic.description ?? "");
                              setEditCategoryId(topic.category_id);
                              setError("");
                              setMessage("");
                            }}
                            className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(topic.id)}
                            disabled={saving}
                            className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 hover:bg-red-950/50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function MyTopicsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
          Loading your topics...
        </div>
      }
    >
      <MyTopicsContent />
    </Suspense>
  );
}
