
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
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

        const defaultCategory =
          categoryData.find(
            (category) => category.name === "Fundamentals"
          ) ?? categoryData[0];

        if (defaultCategory) {
          setSelectedCategoryId(defaultCategory.id);
        }
      } catch (err) {
        console.error("Supabase error:", err);
        setError("Unable to load content. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredTopics = topics.filter(
    (topic) => topic.category_id === selectedCategoryId
  );

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="h-16 border-b border-gray-800 flex items-center px-6">
        <Link href="/" className="text-xl font-bold">
          System Design Hub
        </Link>

        <div className="ml-auto">
        <Link
          href="/admin/articles/new"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
        >
          + Create Article
        </Link>
      </div>
      </header>

      <div className="flex">
        <aside className="w-64 min-h-screen border-r border-gray-800 p-5 shrink-0">
          <h2 className="text-sm font-semibold text-gray-400 mb-5">
            CATEGORIES
          </h2>

          <nav className="space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`block w-full text-left rounded-lg px-3 py-2 text-sm ${
                  selectedCategoryId === category.id
                    ? "bg-blue-500/10 text-blue-400 font-semibold"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {category.name}
              </button>
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
