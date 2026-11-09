
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type CommunityArticle = {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  topic_id: string | null;
  created_at: string;
};

type PublicProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type Category = {
  id: string;
  name: string;
};

type Topic = {
  id: string;
  title: string;
};

export default function CommunityPage() {
  const [supabase] = useState(() => createClient());

  const [articles, setArticles] = useState<CommunityArticle[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [topics, setTopics] = useState<Record<string, Topic>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCommunity = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: articleData, error: articleError } = await supabase
        .from("user_articles")
        .select(
          "id, user_id, title, slug, description, category_id, topic_id, created_at"
        )
        .eq("status", "published")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(100);

      if (articleError) throw articleError;

      const loadedArticles = (articleData ?? []) as CommunityArticle[];
      setArticles(loadedArticles);

      const userIds = [
        ...new Set(loadedArticles.map((article) => article.user_id)),
      ];

      const categoryIds = [
        ...new Set(
          loadedArticles
            .map((article) => article.category_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const topicIds = [
        ...new Set(
          loadedArticles
            .map((article) => article.topic_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const [profileResult, categoryResult, topicResult] =
        await Promise.all([
          userIds.length
            ? supabase
                .from("user_profiles")
                .select("id, username, display_name, avatar_url")
                .in("id", userIds)
            : Promise.resolve({ data: [], error: null }),

          categoryIds.length
            ? supabase
                .from("user_categories")
                .select("id, name")
                .in("id", categoryIds)
            : Promise.resolve({ data: [], error: null }),

          topicIds.length
            ? supabase
                .from("user_topics")
                .select("id, title")
                .in("id", topicIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (profileResult.error) throw profileResult.error;
      if (categoryResult.error) throw categoryResult.error;
      if (topicResult.error) throw topicResult.error;

      const profileMap: Record<string, PublicProfile> = {};
      (profileResult.data ?? []).forEach((profile) => {
        profileMap[profile.id] = profile as PublicProfile;
      });
      setProfiles(profileMap);

      const categoryMap: Record<string, Category> = {};
      (categoryResult.data ?? []).forEach((category) => {
        categoryMap[category.id] = category as Category;
      });
      setCategories(categoryMap);

      const topicMap: Record<string, Topic> = {};
      (topicResult.data ?? []).forEach((topic) => {
        topicMap[topic.id] = topic as Topic;
      });
      setTopics(topicMap);
    } catch (err) {
      console.error("Community loading error:", err);
      setError("Unable to load Community. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  const filteredArticles = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return articles;

    return articles.filter((article) => {
      const profile = profiles[article.user_id];
      const category = article.category_id
        ? categories[article.category_id]
        : undefined;
      const topic = article.topic_id
        ? topics[article.topic_id]
        : undefined;

      return (
        article.title.toLowerCase().includes(term) ||
        (article.description ?? "").toLowerCase().includes(term) ||
        (profile?.display_name ?? "").toLowerCase().includes(term) ||
        (profile?.username ?? "").toLowerCase().includes(term) ||
        (category?.name ?? "").toLowerCase().includes(term) ||
        (topic?.title ?? "").toLowerCase().includes(term)
      );
    });
  }, [articles, profiles, categories, topics, search]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            System Design <span className="text-blue-400">Hub</span>
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <Link href="/articles" className="text-gray-300 hover:text-white">
              Articles
            </Link>

            <Link href="/community" className="text-blue-400">
              Community
            </Link>

            <Link href="/my-space" className="text-gray-300 hover:text-white">
              My Space
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="text-sm font-semibold tracking-wider text-blue-400">
            KNOWLEDGE SHARED BY THE COMMUNITY
          </p>

          <h1 className="mt-3 text-4xl font-bold">Community</h1>

          <p className="mt-3 max-w-2xl text-gray-400">
            Explore system design articles, learn from other developers,
            and discover new ideas shared by the community.
          </p>
        </div>

        <div className="mb-8">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search articles, authors, categories or topics..."
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-5 py-4 text-white outline-none focus:border-blue-500"
          />

          <p className="mt-2 text-sm text-gray-500">
            Search by article title, description, author, category or topic.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
            {error}

            <button
              onClick={loadCommunity}
              className="ml-3 underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-400">
            Loading community articles...
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/50 px-6 py-16 text-center">
            <div className="text-4xl">📚</div>

            <h2 className="mt-4 text-xl font-semibold">
              {search ? "No matching articles" : "No public articles yet"}
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              {search
                ? "Try a different search term."
                : "Published public articles from community members will appear here."}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Explore articles</h2>

              <span className="text-sm text-gray-500">
                {filteredArticles.length} articles
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {filteredArticles.map((article) => {
                const profile = profiles[article.user_id];

                const category = article.category_id
                  ? categories[article.category_id]
                  : undefined;

                const topic = article.topic_id
                  ? topics[article.topic_id]
                  : undefined;

                return (
                  <article
                    key={article.id}
                    className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-blue-500/60"
                  >
                    <Link
                      href={`/community/articles/${article.id}`}
                      className="group block"
                    >
                      <h3 className="text-xl font-semibold leading-snug group-hover:text-blue-400">
                        {article.title}
                      </h3>

                      {(category || topic) && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                          {category && (
                            <span>
                              Category:{" "}
                              <span className="font-medium text-blue-300">
                                {category.name}
                              </span>
                            </span>
                          )}

                          {topic && (
                            <span>
                              Topic:{" "}
                              <span className="font-medium text-purple-300">
                                {topic.title}
                              </span>
                            </span>
                          )}
                        </div>
                      )}

                      {article.description && (
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                          {article.description}
                        </p>
                      )}

                      <span className="mt-4 inline-block text-sm font-medium text-blue-400 group-hover:text-blue-300">
                        Read article →
                      </span>
                    </Link>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-800 pt-4">
                      {profile ? (
                        <Link
                          href={`/users/${encodeURIComponent(profile.username)}`}
                          className="flex min-w-0 items-center gap-3 hover:text-blue-400"
                        >
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-sm font-semibold">
                              {profile.display_name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {profile.display_name}
                            </p>

                            <p className="truncate text-xs text-gray-500">
                              @{profile.username}
                            </p>
                          </div>
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-500">
                          Community member
                        </span>
                      )}

                      <span className="shrink-0 text-xs text-gray-500">
                        {new Date(article.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
