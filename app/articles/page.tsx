
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Article = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  created_at: string;
  topic: {
    title: string;
    category: {
      name: string;
    };
  };
};

const ADMIN_ID = "128968c8-eea9-44f7-be54-2c32cab65e30";

export default function AllArticlesPage() {
  const [supabase] = useState(() => createClient());

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  async function deleteArticle(articleId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this article?"
    );

    if (!confirmed) return;

    const { data: authData } = await supabase.auth.getUser();

    if (authData.user?.id !== ADMIN_ID) {
      alert("You are not authorized to delete articles.");
      return;
    }

    const { error } = await supabase
      .from("articles")
      .delete()
      .eq("id", articleId)
      .select("id")
      .single();

    if (error) {
      console.error("Delete error:", error);
      alert("Unable to delete article. Please try again.");
      return;
    }

    setArticles((previous) =>
      previous.filter((article) => article.id !== articleId)
    );
  }

  useEffect(() => {
    async function fetchArticles() {
      const { data: authData } = await supabase.auth.getUser();
      const admin = authData.user?.id === ADMIN_ID;

      setIsAdmin(admin);

      const { data, error } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          status,
          created_at,
          topic:topics (
            title,
            category:categories (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching articles:", error);
      } else {
        setArticles((data ?? []) as unknown as Article[]);
      }

      setLoading(false);
    }

    fetchArticles();
  }, [supabase]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          articles
            .map((article) => article.topic?.category?.name)
            .filter(Boolean)
        )
      ),
    [articles]
  );

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesSearch = article.title
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || article.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        article.topic?.category?.name === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [articles, search, statusFilter, categoryFilter]);

  const publishedCount = articles.filter(
    (article) => article.status === "published"
  ).length;

  const draftCount = articles.filter(
    (article) => article.status === "draft"
  ).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            System Design <span className="text-blue-400">Hub</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl p-8">

        <div className="flex items-center justify-between mt-2 mb-2">
          <h1 className="text-3xl font-bold">
            All Articles
          </h1>

          {isAdmin && (
            <Link
              href="/admin/articles/new"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              + Create Article
            </Link>
          )}
        </div>

        <p className="text-gray-400 mb-6">
          Explore and manage your system design articles.
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search articles by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 mb-4 rounded-lg bg-gray-900 border border-gray-700 outline-none focus:border-blue-500"
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-3 rounded-lg bg-gray-900 border border-gray-700"
          >
            <option value="all">All Status ({articles.length})</option>
            <option value="published">
              Published ({publishedCount})
            </option>
            {isAdmin && (
              <option value="draft">
                Drafts ({draftCount})
              </option>
            )}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-3 rounded-lg bg-gray-900 border border-gray-700"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Article list */}
        {loading ? (
          <p className="text-gray-400">Loading articles...</p>
        ) : filteredArticles.length === 0 ? (
          <p className="text-gray-400">
            No matching articles found.
          </p>
        ) : (
          <div className="grid gap-4">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="relative flex items-center justify-between gap-4 border border-gray-800 rounded-xl p-5 hover:border-blue-500 hover:bg-gray-900/50 transition"
              >
                <Link
                  href={
                    isAdmin
                      ? `/admin/articles/${article.id}/edit`
                      : `/articles/${article.slug}`
                  }
                  className="absolute inset-0 rounded-xl"
                  aria-label={`Open ${article.title}`}
                />

                <div className="flex-1 min-w-0 pointer-events-none">
                  <h2 className="text-xl font-semibold mb-2">
                    {article.title}
                  </h2>

                  <p className="text-sm text-gray-400">
                    {article.topic?.category?.name} ·{" "}
                    {article.topic?.title}
                  </p>

                  <p className="text-xs text-gray-500 mt-3">
                    {new Date(article.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 pointer-events-none">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      article.status === "published"
                        ? "bg-green-900/50 text-green-400"
                        : "bg-yellow-900/50 text-yellow-400"
                    }`}
                  >
                    {article.status === "published"
                      ? "Published"
                      : "Draft"}
                  </span>
                </div>

                {isAdmin && (
                  <div className="relative z-10 flex items-center gap-2">
                    <Link
                      href={`/admin/articles/${article.id}/edit`}
                      className="px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-gray-800 text-sm"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() => deleteArticle(article.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-800 text-red-400 hover:bg-red-950 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <p className="text-xs text-gray-500 mt-5">
            Showing {filteredArticles.length} of {articles.length} articles
          </p>
        )}

      </main>
    </div>
  );
}
