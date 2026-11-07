
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
  slug: string;
};

const ADMIN_ID = "128968c8-eea9-44f7-be54-2c32cab65e30";

export default function ManagePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function initialize() {
      const { data: authData } = await supabase.auth.getUser();

      if (authData.user?.id !== ADMIN_ID) {
        router.replace("/admin/login");
        return;
      }

      await fetchCategories();
      setLoading(false);
    }

    initialize();
  }, [supabase, router]);

  async function fetchCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name");

    if (error) {
      console.error(error);
      setMessage("Unable to load categories.");
      return;
    }

    setCategories(data ?? []);
  }

  function createSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function saveCategory() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setMessage("Please enter a category name.");
      return;
    }

    setSaving(true);
    setMessage("");

    const slug = createSlug(trimmedName);

    const query = editingId
      ? supabase
          .from("categories")
          .update({ name: trimmedName, slug })
          .eq("id", editingId)
      : supabase
          .from("categories")
          .insert({ name: trimmedName, slug });

    const { error } = await query;

    if (error) {
      console.error(error);
      setMessage(
        error.code === "23505"
          ? "A category with this name or slug already exists."
          : error.message
      );
      setSaving(false);
      return;
    }

    setName("");
    setEditingId(null);
    setMessage(editingId ? "Category updated!" : "Category added!");

    await fetchCategories();
    setSaving(false);
  }

  function editCategory(category: Category) {
    setEditingId(category.id);
    setName(category.name);
    setMessage("");
  }

  async function deleteCategory(category: Category) {
    const { count, error: countError } = await supabase
      .from("topics")
      .select("id", { count: "exact", head: true })
      .eq("category_id", category.id);

    if (countError) {
      console.error(countError);
      setMessage("Unable to check topics for this category.");
      return;
    }

    if ((count ?? 0) > 0) {
      setMessage(
        `Cannot delete "${category.name}" because it contains ${count} topic(s). Move or delete those topics first.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete the category "${category.name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      console.error(error);
      setMessage("Unable to delete category.");
      return;
    }

    setCategories((previous) =>
      previous.filter((item) => item.id !== category.id)
    );

    setMessage("Category deleted.");
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setMessage("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white p-8">
        Loading category management...
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

        <h1 className="text-3xl font-bold mt-6">
          Manage Categories
        </h1>

        <p className="text-gray-400 mt-2 mb-8">
          Create, rename and organize your learning categories.
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? "Edit Category" : "Add New Category"}
          </h2>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            className="w-full p-3 rounded-lg bg-gray-950 border border-gray-700 outline-none focus:border-blue-500"
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={saveCategory}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Category"
                  : "Add Category"}
            </button>

            {editingId && (
              <button
                onClick={cancelEdit}
                className="px-5 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>

          {message && (
            <p className="text-sm text-blue-400 mt-4">
              {message}
            </p>
          )}
        </div>

        <h2 className="text-xl font-semibold mb-4">
          Existing Categories ({categories.length})
        </h2>

        <div className="grid gap-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-4 p-5 rounded-xl border border-gray-800 bg-gray-900"
            >
              <div>
                <h3 className="font-semibold">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  /{category.slug}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => editCategory(category)}
                  className="px-3 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 text-sm"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteCategory(category)}
                  className="px-3 py-2 rounded-lg border border-red-800 text-red-400 hover:bg-red-950 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <p className="text-gray-400">
              No categories found.
            </p>
          )}
        </div>

        <div className="mt-8">
          <Link
            href="/articles"
            className="text-blue-400 hover:text-blue-300"
          >
            ← Back to Articles
          </Link>
        </div>

      </div>
    </main>
  );
}
