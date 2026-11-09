
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "@/components/NotificationBell";

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

type Article = {
  id: string;
  title: string;
  slug: string;
  created_at: string;
};

const ADMIN_ID = "128968c8-eea9-44f7-be54-2c32cab65e30";

const categoryDetails: Record<
  string,
  { icon: string; description: string }
> = {
  fundamentals: {
    icon: "📚",
    description: "Build a strong foundation in system design principles.",
  },
  "distributed-systems": {
    icon: "🌐",
    description: "Explore database architecture, indexing and scaling.",
  },
  caching: {
    icon: "⚡",
    description: "Learn caching strategies and high-performance systems.",
  },
  "message-queues": {
    icon: "📨",
    description: "Explore asynchronous communication and event streaming.",
  },
  "system-design-problems": {
    icon: "🗂️",
    description: "Practice designing real-world scalable applications.",
  },
};

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const [authClient] = useState(() => createClient());

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Check authentication and keep navigation in sync.
  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      try {
        const {
          data: { session },
          error,
        } = await authClient.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("Authentication error:", error);
          setIsAdmin(false);
          setIsAuthenticated(false);
        } else {
          const user = session?.user;

          setIsAuthenticated(!!user);
          setIsAdmin(user?.id === ADMIN_ID);
        }
      } catch (err) {
        if (mounted) {
          console.error("Authentication check failed:", err);
          setIsAdmin(false);
          setIsAuthenticated(false);
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    checkUser();

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      const user = session?.user;

      setIsAuthenticated(!!user);
      setIsAdmin(user?.id === ADMIN_ID);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [authClient]);

  // Fetch global categories, topics and published articles.
  useEffect(() => {
    async function fetchData() {
      try {
        const [categoryResult, topicResult, articleResult] =
          await Promise.all([
            supabase.from("categories").select("id, name, slug"),

            supabase
              .from("topics")
              .select("id, category_id, title, slug, description"),

            supabase
              .from("articles")
              .select("id, title, slug, created_at")
              .eq("status", "published")
              .order("created_at", { ascending: false })
              .limit(3),
          ]);

        if (categoryResult.error) throw categoryResult.error;
        if (topicResult.error) throw topicResult.error;
        if (articleResult.error) throw articleResult.error;

        const categoryData = categoryResult.data ?? [];
        const topicData = topicResult.data ?? [];

        setCategories(categoryData);
        setTopics(topicData);
        setArticles(articleResult.data ?? []);

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
  }, []);

  const filteredTopics = topics.filter(
    (topic) => topic.category_id === selectedCategoryId
  );

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId
  );

  function startLearning() {
    document.getElementById("categories")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function selectCategory(categoryId: string) {
    setSelectedCategoryId(categoryId);

    window.history.replaceState(
      null,
      "",
      `/?category=${categoryId}`
    );

    document.getElementById("topics")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function getCategoryDetails(category: Category) {
    return (
      categoryDetails[category.slug] ?? {
        icon: "💡",
        description:
          "Explore concepts, patterns and engineering principles.",
      }
    );
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await authClient.auth.getSession();

      if (sessionError) {
        console.error("Session check during logout:", sessionError);
      }

      if (session) {
        const { error: signOutError } =
          await authClient.auth.signOut();

        if (signOutError) {
          throw signOutError;
        }
      }

      setIsAdmin(false);
      setIsAuthenticated(false);

      window.location.replace("/");
    } catch (err) {
      console.error("Logout error:", err);
      alert("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080d19] text-gray-100">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-[#080d19]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/" className="shrink-0 text-xl font-bold tracking-tight">
            System Design <span className="text-blue-500">Hub</span>
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            <Link
              href="/articles"
              className="rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-white"
            >
              All Articles
            </Link>

            <Link
              href="/community"
              className="rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-white"
            >
              Community Articles
            </Link>

            {!authLoading && (
              <>
               {isAdmin ? (
                  <>
                    <Link
                      href="/admin/analytics"
                      className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-white transition hover:bg-gray-700"
                    >
                      Analytics
                    </Link>

                    <Link
                      href="/admin/manage"
                      className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-white transition hover:bg-gray-700"
                    >
                      Manage Categories
                    </Link>

                    <Link
                      href="/admin/articles/new"
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                    >
                      + Create Article
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loggingOut ? "Logging out..." : "Logout"}
                    </button>
                  </>
               ) : isAuthenticated ? (
  <>
    <Link
      href="/my-space"
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
    >
      My Space
    </Link>

    <NotificationBell />

    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-white disabled:opacity-60"
    >
      {loggingOut ? "Logging out..." : "Logout"}
    </button>
  </>
                ) : (
                  <>
                    <Link
                      href="/admin/login"
                      className="rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-white"
                    >
                      Admin Login
                    </Link>

                    <Link
                      href="/login"
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-200 transition hover:bg-gray-800 hover:text-white"
                    >
                      Sign In
                    </Link>

                    <Link
                      href="/signup"
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="relative overflow-hidden border-b border-gray-800/70">
          <div className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold tracking-wider text-blue-400">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                LEARN · DESIGN · BUILD
              </div>

              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Master System Design,
                <span className="block text-blue-500">
                  One Concept at a Time.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-gray-400 sm:text-lg">
                Learn how scalable software systems are built. Explore
                distributed systems, databases, caching, messaging and
                real-world architecture patterns.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={startLearning}
                  className="rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-500"
                >
                  Start Learning →
                </button>

                <Link
                  href="/articles"
                  className="rounded-xl border border-gray-700 bg-gray-900 px-7 py-3.5 text-sm font-semibold text-gray-200 transition hover:border-gray-500 hover:bg-gray-800"
                >
                  Explore Articles
                </Link>
                <Link
                  href="/my-space/articles/new"
                  className="rounded-xl border border-gray-700 bg-gray-900 px-7 py-3.5 text-sm font-semibold text-gray-200 transition hover:border-gray-500 hover:bg-gray-800"
                >
                  + Create Article
                </Link>
              </div>

              <div className="mt-12 flex flex-wrap gap-8 border-t border-gray-800 pt-7">
                <div>
                  <p className="text-2xl font-bold">{categories.length}+</p>
                  <p className="mt-1 text-sm text-gray-500">Categories</p>
                </div>

                <div>
                  <p className="text-2xl font-bold">{topics.length}+</p>
                  <p className="mt-1 text-sm text-gray-500">Topics</p>
                </div>

                <div>
                  <p className="text-2xl font-bold">{articles.length}+</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Featured articles
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section
          id="categories"
          className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8"
        >
          <div className="mb-10">
            <p className="mb-3 text-sm font-semibold tracking-widest text-blue-400">
              EXPLORE AND LEARN
            </p>

            <h2 className="text-3xl font-bold tracking-tight">
              Explore Learning Categories
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-gray-400">
              Start with the fundamentals or dive directly into the
              engineering concepts that interest you.
            </p>
          </div>

          {loading ? (
            <p className="text-gray-400">Loading categories...</p>
          ) : error ? (
            <p className="text-red-400">{error}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const details = getCategoryDetails(category);

                const topicCount = topics.filter(
                  (topic) => topic.category_id === category.id
                ).length;

                return (
                  <div
                    key={category.id}
                    className="group rounded-2xl border border-gray-800 bg-[#0d1423] p-6 transition duration-200 hover:-translate-y-1 hover:border-blue-500/60 hover:bg-[#111c30]"
                  >
                    <button
                      type="button"
                      onClick={() => selectCategory(category.id)}
                      className="block w-full text-left"
                    >
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-2xl">
                        {details.icon}
                      </div>

                      <h3 className="text-lg font-semibold transition group-hover:text-blue-400">
                        {category.name}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-400">
                        {details.description}
                      </p>

                      <div className="mt-5 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {topicCount} topics
                        </span>

                        <span className="text-blue-400 transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    </button>

                    {isAdmin && (
                      <div className="mt-5 border-t border-gray-800 pt-4">
                        <Link
                          href={`/admin/manage/topics/${category.id}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-400 transition hover:border-blue-500/60 hover:bg-blue-500/20 hover:text-blue-300"
                        >
                          <span>✏️</span>
                          Manage Topics
                          <span>→</span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* POPULAR ARTICLES */}
        <section className="border-y border-gray-800/70 bg-[#0b1220]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-3 text-sm font-semibold tracking-widest text-blue-400">
                  KNOWLEDGE LIBRARY
                </p>

                <h2 className="text-3xl font-bold tracking-tight">
                  Explore Articles
                </h2>

                <p className="mt-3 text-gray-400">
                  Deep dives into concepts and real-world system architectures.
                </p>
              </div>

              <Link
                href="/articles"
                className="text-sm font-semibold text-blue-400 transition hover:text-blue-300"
              >
                View all articles →
              </Link>
            </div>

            {loading ? (
              <p className="text-gray-400">Loading articles...</p>
            ) : articles.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-3">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/articles/${article.slug}`}
                    className="group rounded-2xl border border-gray-800 bg-[#080d19] p-6 transition hover:-translate-y-1 hover:border-blue-500/60"
                  >
                    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-xl">
                      📖
                    </div>

                    <h3 className="text-lg font-semibold leading-7 group-hover:text-blue-400">
                      {article.title}
                    </h3>

                    <p className="mt-5 text-sm font-medium text-blue-400">
                      Read article →
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">
                Published articles will appear here.
              </p>
            )}
          </div>
        </section>

        {/* TOPIC EXPLORER */}
        <section
          id="topics"
          className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8"
        >
          <div className="mb-10">
            <p className="mb-3 text-sm font-semibold tracking-widest text-blue-400">
              YOUR LEARNING PATH
            </p>

            <h2 className="text-3xl font-bold tracking-tight">
              {selectedCategory
                ? `Explore ${selectedCategory.name}`
                : "Explore Topics"}
            </h2>

            <p className="mt-3 text-gray-400">
              Choose a topic to dive deeper into system design.
            </p>
          </div>

          {loading ? (
            <p className="text-gray-400">Loading topics...</p>
          ) : error ? (
            <p className="text-red-400">{error}</p>
          ) : (
            <div className="max-w-4xl space-y-3">
              {filteredTopics.map((topic, index) => (
                <Link
                  key={topic.id}
                  href={`/topics/${topic.slug}`}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-[#0d1423] p-5 transition hover:border-blue-500/60 hover:bg-[#111c30]"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-sm font-semibold text-blue-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div>
                      <h3 className="font-semibold group-hover:text-blue-400">
                        {topic.title}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        {topic.description}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-gray-500 transition group-hover:translate-x-1 group-hover:text-blue-400">
                    →
                  </span>
                </Link>
              ))}

              {filteredTopics.length === 0 && (
                <p className="rounded-xl border border-gray-800 p-6 text-gray-500">
                  No topics available in this category yet.
                </p>
              )}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-800 bg-[#060a13]">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
          <div>
            <Link href="/" className="text-lg font-bold">
              System Design <span className="text-blue-500">Hub</span>
            </Link>

            <p className="mt-2 text-sm text-gray-500">
              Learn. Design. Build scalable systems.
            </p>
          </div>

          <div className="flex flex-wrap gap-5 text-sm text-gray-400">
            <Link href="/" className="hover:text-white">
              Home
            </Link>

            <Link href="/articles" className="hover:text-white">
              Articles
            </Link>

            <Link href="/community" className="hover:text-white">
              Community
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-800/70 px-5 py-5 text-center text-xs text-gray-600">
          © {currentYear ?? ""} System Design Hub. Built for curious engineers.
        </div>
      </footer>
    </div>
  );
}
