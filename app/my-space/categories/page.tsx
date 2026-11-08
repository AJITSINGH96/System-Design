
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export default function MyCategoriesPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCategories = useCallback(async () => {
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
        .from("user_categories")
        .select("id, name, slug, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      setCategories(data ?? []);
    } catch (err) {
      console.error("Categories loading error:", err);
      setError("Unable to load your categories. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  function createSlug(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newName.trim();

    if (!name) {
      setError("Please enter a category name.");
      return;
    }

    if (categories.some(
      (category) => category.name.toLowerCase() === name.toLowerCase()
    )) {
      setError("You already have a category with this name.");
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
        .from("user_categories")
        .insert({
          user_id: user.id,
          name,
          slug: createSlug(name),
        });

      if (insertError) throw insertError;

      setNewName("");
      setMessage("Category created successfully.");
      await loadCategories();
    } catch (err) {
      console.error("Category creation error:", err);
      setError("Unable to create category. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(categoryId: string) {
    const name = editingName.trim();

    if (!name) {
      setError("Category name cannot be empty.");
      return;
    }

    if (categories.some(
      (category) =>
        category.id !== categoryId &&
        category.name.toLowerCase() === name.toLowerCase()
    )) {
      setError("You already have a category with this name.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: updateError } = await supabase
        .from("user_categories")
        .update({
          name,
          slug: createSlug(name),
        })
        .eq("id", categoryId);

      if (updateError) throw updateError;

      setEditingId(null);
      setEditingName("");
      setMessage("Category updated successfully.");
      await loadCategories();
    } catch (err) {
      console.error("Category update error:", err);
      setError("Unable to update category. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(categoryId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this category?"
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: deleteError } = await supabase
        .from("user_categories")
        .delete()
        .eq("id", categoryId);

      if (deleteError) throw deleteError;

      setMessage("Category deleted successfully.");
      await loadCategories();
    } catch (err) {
      console.error("Category deletion error:", err);
      setError(
        "Unable to delete category. It may be linked to existing topics."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
        Loading your categories...
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
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm transition hover:bg-gray-800"
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

        <div className="mb-8 mt-6">
          <p className="text-sm font-medium text-blue-400">
            PERSONAL WORKSPACE
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            My Categories
          </h1>
          <p className="mt-2 text-gray-400">
            Organize your system design knowledge into your own categories.
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
          <h2 className="text-lg font-semibold">
            Create a new category
          </h2>

          <form onSubmit={handleCreate} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="e.g. Distributed Systems"
              maxLength={80}
              className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Category"}
            </button>
          </form>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Your categories
            </h2>
            <span className="text-sm text-gray-500">
              {categories.length} categories
            </span>
          </div>

          {categories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/50 px-6 py-14 text-center">
              <div className="text-4xl">📁</div>
              <h3 className="mt-4 text-lg font-semibold">
                No categories yet
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Create your first category to organize your knowledge.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex flex-col gap-4 rounded-xl border border-gray-800 bg-gray-900 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  {editingId === category.id ? (
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      maxLength={80}
                      autoFocus
                      className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 outline-none focus:border-blue-500"
                    />
                  ) : (
                    <div>
                      <h3 className="font-semibold">
                        📁 {category.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        Created {new Date(category.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {editingId === category.id ? (
                      <>
                        <button
                          onClick={() => handleUpdate(category.id)}
                          disabled={saving}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditingName("");
                            setError("");
                          }}
                          className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(category.id);
                            setEditingName(category.name);
                            setError("");
                            setMessage("");
                          }}
                          className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          disabled={saving}
                          className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 hover:bg-red-950/50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
