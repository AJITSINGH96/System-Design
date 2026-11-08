
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Topic = {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  description: string;
};

const ADMIN_ID = "128968c8-eea9-44f7-be54-2c32cab65e30";

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [authClient] = useState(() => createClient());

  useEffect(() => {
    async function fetchData() {
      try {
        // Check whether the current user is the admin
        const { data: authData } = await authClient.auth.getUser();

        setIsAdmin(authData.user?.id === ADMIN_ID);

        // Fetch categories and topics
        const [categoryResult, topicResult] = await Promise.all([
          supabase.from("categories").select("id, name, slug"),
          supabase.from("topics").select(
            "id, category_id, title, slug, description"
          ),
        ]);

        if (categoryResult.error) throw categoryResult.error;
        if (topicResult.error) throw topicResult.error;

        const categoryData = categoryResult.data ?? [];
        const topicData = topicResult.data ?? [];

        setCategories(categoryData);
        setTopics(topicData);

        const searchParams = new URLSearchParams(window.location.search);
        const categoryFromUrl = searchParams.get("category");

        const selectedCategory =
          categoryData.find(
            (category) => category.id === categoryFromUrl
          ) ??
          categoryData.find(
            (category) => category.name === "Fundamentals"
          ) ??
          categoryData[0];

        if (selectedCategory) {
          setSelectedCategoryId(selectedCategory.id);
        }
      } catch (err) {
        console.error("Supabase error:", err);
        setError("Unable to load content. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [authClient]);

  const filteredTopics = topics.filter(
    (topic) => topic.category_id === selectedCategoryId
  );

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="min-h-16 border-b border-gray-800 flex items-center px-6 py-3">
        <Link href="/" className="text-xl font-bold">
          System Design Hub
        </Link>

        <div className="ml-auto flex items-center gap-3 flex-wrap justify-end">
          <Link
            href="/articles"
            className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition"
          >
            All Articles
          </Link>

          {isAdmin ? (
            <>
              <Link
                href="/admin/manage"
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition"
              >
                Manage Categories
              </Link>

              <Link
                href="/admin/articles/new"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
              >
                + Create Article
              </Link>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
            >
              Login
            </Link>
          )}
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 min-h-screen border-r border-gray-800 p-5 shrink-0">
          <h2 className="text-sm font-semibold text-gray-400 mb-5">
            CATEGORIES
          </h2>

          <nav className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`flex items-center gap-2 rounded-lg px-2 ${
                  selectedCategoryId === category.id
                    ? "bg-blue-500/10"
                    : "hover:bg-gray-800"
                }`}
              >
                <button
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`flex-1 text-left py-2 text-sm truncate ${
                    selectedCategoryId === category.id
                      ? "text-blue-400 font-semibold"
                      : "text-gray-300"
                  }`}
                >
                  {category.name}
                </button>

                {isAdmin && (
                  <Link
                    href={`/admin/manage/topics/${category.id}`}
                    className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 shrink-0"
                  >
                    Edit
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-10">
          <div className="max-w-3xl">
            <p className="text-blue-400 text-sm mb-3">
              YOUR SYSTEM DESIGN LEARNING SPACE
            </p>

            <h2 className="text-3xl font-bold mb-3">
              {selectedCategory?.name ?? "System Design"}
            </h2>

            <p className="text-gray-400 leading-7 mb-8">
              Explore important concepts, architecture patterns
              and engineering principles.
            </p>

            {loading ? (
              <p className="text-gray-400">Loading content...</p>
            ) : error ? (
              <p className="text-red-400">{error}</p>
            ) : (
              <div className="space-y-3">
                {filteredTopics.map((topic) => (
                  <Link
                    key={topic.id}
                    href={`/topics/${topic.slug}`}
                    className="block border border-gray-800 rounded-xl p-5 hover:border-blue-500 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{topic.title}</p>

                        <p className="text-gray-500 text-sm mt-1">
                          {topic.description}
                        </p>
                      </div>

                      <span className="text-gray-500">→</span>
                    </div>
                  </Link>
                ))}

                {filteredTopics.length === 0 && (
                  <p className="text-gray-500">
                    No topics available in this category yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
