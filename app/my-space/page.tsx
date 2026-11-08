
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
};

type Article = {
  id: string;
  title: string;
  slug: string;
  status: string;
  visibility: string;
  updated_at: string;
};

export default function MySpacePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [profile, setProfile] = useState<Profile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);

  const [categoryCount, setCategoryCount] = useState(0);
  const [topicCount, setTopicCount] = useState(0);
  const [articleCount, setArticleCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
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

      // Load the user's profile.
      const { data: profileData, error: profileError } =
        await supabase
          .from("user_profiles")
          .select("username, display_name, bio, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        router.replace("/profile/setup");
        return;
      }

      setProfile(profileData);

      // Load personal categories, topics and article counts.
      const [
        categoriesResult,
        topicsResult,
        articlesResult,
        draftsResult,
        publishedResult,
        recentArticlesResult,
      ] = await Promise.all([
        supabase
          .from("user_categories")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),

        supabase
          .from("user_topics")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),

        supabase
          .from("user_articles")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),

        supabase
          .from("user_articles")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "draft"),

        supabase
          .from("user_articles")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "published"),

        supabase
          .from("user_articles")
          .select("id, title, slug, status, visibility, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(5),
      ]);

      const results = [
        categoriesResult,
        topicsResult,
        articlesResult,
        draftsResult,
        publishedResult,
        recentArticlesResult,
      ];

      const failedResult = results.find((result) => result.error);

      if (failedResult?.error) {
        throw failedResult.error;
      }

      setCategoryCount(categoriesResult.count ?? 0);
      setTopicCount(topicsResult.count ?? 0);
      setArticleCount(articlesResult.count ?? 0);
      setDraftCount(draftsResult.count ?? 0);
      setPublishedCount(publishedResult.count ?? 0);
      setArticles(recentArticlesResult.data ?? []);
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError("Unable to load your dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleLogout() {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      setError("Unable to log out. Please try again.");
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-300 flex items-center justify-center">
        Loading your workspace...
      </div>
    );
  }

  const managementCards = [
    {
      href: "/my-space/categories",
      icon: "📁",
      title: "My Categories",
      description:
        "Organize your knowledge base into your own categories.",
      count: `${categoryCount} categories`,
    },
    {
      href: "/my-space/topics",
      icon: "🗂️",
      title: "My Topics",
      description:
        "Group related system design articles into topics.",
      count: `${topicCount} topics`,
    },
    {
      href: "/my-space/articles",
      icon: "📝",
      title: "My Articles",
      description:
        "Write, edit and publish your own system design articles.",
      count: `${articleCount} articles`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            System Design <span className="text-blue-400">Hub</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-gray-400 sm:block">
              {profile?.display_name}
            </span>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm transition hover:bg-gray-800 disabled:opacity-50"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <p className="text-sm font-medium text-blue-400">
            PERSONAL WORKSPACE
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Welcome, {profile?.display_name}!
          </h1>

          <p className="mt-2 text-gray-400">
            Manage your categories, topics and system design articles.
          </p>

          <p className="mt-3 text-sm text-gray-500">
            @{profile?.username}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
            {error}
            <button
              onClick={loadDashboard}
              className="ml-3 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Statistics */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">
            Workspace overview
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "Categories",
                value: categoryCount,
                color: "text-blue-400",
              },
              {
                label: "Topics",
                value: topicCount,
                color: "text-purple-400",
              },
              {
                label: "Articles",
                value: articleCount,
                color: "text-cyan-400",
              },
              {
                label: "Drafts",
                value: draftCount,
                color: "text-yellow-400",
              },
              {
                label: "Published",
                value: publishedCount,
                color: "text-green-400",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-gray-800 bg-gray-900 p-5"
              >
                <p className="text-sm text-gray-400">
                  {item.label}
                </p>

                <p className={`mt-2 text-3xl font-bold ${item.color}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Content management */}
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">
            Manage your content
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {managementCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group block rounded-xl border border-gray-800 bg-gray-900 p-6 transition duration-200 hover:-translate-y-1 hover:border-blue-500 hover:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="text-2xl">
                  {card.icon}
                </div>

                <h3 className="mt-4 text-lg font-semibold group-hover:text-blue-400">
                  {card.title}
                </h3>

                <p className="mt-2 text-sm text-gray-400">
                  {card.description}
                </p>

                <p className="mt-4 text-sm text-gray-500">
                  {card.count}
                </p>

                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-400">
                  Manage
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent articles */}
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Recently updated articles
            </h2>

            <Link
              href="/my-space/articles"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View all →
            </Link>
          </div>

          {articles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/50 px-6 py-12 text-center">
              <div className="text-4xl">📚</div>

              <h3 className="mt-4 text-lg font-semibold">
                Your workspace is empty
              </h3>

              <p className="mt-2 text-sm text-gray-400">
                Your articles will appear here once you start writing.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-800">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="flex flex-col gap-3 border-b border-gray-800 bg-gray-900 p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-medium">
                      {article.title}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Updated{" "}
                      {new Date(article.updated_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-800 px-3 py-1 text-xs capitalize text-gray-300">
                      {article.status}
                    </span>

                    <span className="rounded-full bg-gray-800 px-3 py-1 text-xs capitalize text-gray-300">
                      {article.visibility}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Profile */}
        <section className="mt-12 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold">
            Your community profile
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Your public profile will let other community members discover
            your published articles.
          </p>

          <p className="mt-4 text-sm text-blue-400">
            @{profile?.username}
          </p>

          {profile?.bio && (
            <p className="mt-2 text-sm text-gray-400">
              {profile.bio}
            </p>
          )}

          <span className="mt-4 inline-block text-xs text-gray-500">
            Public profile page coming next
          </span>
        </section>
      </main>
    </div>
  );
}
