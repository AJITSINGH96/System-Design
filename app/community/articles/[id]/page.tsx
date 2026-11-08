"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { JSONContent } from "@tiptap/core";

import { createClient } from "@/lib/supabase/client";
import ArticleViewer from "@/components/ArticleViewer";

type CommunityArticle = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  content: JSONContent;
  created_at: string;
};

type PublicProfile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
};

function CommunityArticleContent() {
  const params = useParams<{ id: string }>();
  const articleId = params.id;

  const [supabase] = useState(() => createClient());

  const [article, setArticle] = useState<CommunityArticle | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadArticle() {
      setLoading(true);
      setError("");

      try {
        const { data: articleData, error: articleError } = await supabase
          .from("user_articles")
          .select(
            "id, user_id, title, description, content, created_at"
          )
          .eq("id", articleId)
          .eq("status", "published")
          .eq("visibility", "public")
          .maybeSingle();

        if (articleError) throw articleError;

        if (!articleData) {
          setArticle(null);
          setError("This article does not exist or is not publicly available.");
          return;
        }

        const loadedArticle = articleData as CommunityArticle;
        setArticle(loadedArticle);

        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("id, username, display_name, bio, avatar_url")
          .eq("id", loadedArticle.user_id)
          .maybeSingle();

        if (profileError) throw profileError;

        setProfile(profileData as PublicProfile | null);
      } catch (err) {
        console.error("Article loading error:", err);
        setError("Unable to load this article. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (articleId) {
      loadArticle();
    }
  }, [articleId, supabase]);

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

            <Link href="/community" className="text-gray-300 hover:text-white">
              Community
            </Link>

            <Link href="/my-space" className="text-gray-300 hover:text-white">
              My Space
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to Community
        </Link>

        {loading ? (
          <div className="py-20 text-center text-gray-400">
            Loading article...
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
            <h1 className="text-xl font-semibold">Article unavailable</h1>

            <p className="mt-3 text-gray-400">{error}</p>

            <Link
              href="/community"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
            >
              Explore Community
            </Link>
          </div>
        ) : article ? (
          <article className="mt-8">
            <div className="border-b border-gray-800 pb-8">
              <h1 className="text-3xl font-bold leading-tight md:text-4xl">
                {article.title}
              </h1>

              {article.description && (
                <p className="mt-5 text-lg leading-8 text-gray-400">
                  {article.description}
                </p>
              )}

              <div className="mt-7 flex items-center justify-between gap-4">
                {profile ? (
                  <Link
                    href={`/users/${encodeURIComponent(profile.username)}`}
                    className="flex items-center gap-3 hover:text-blue-400"
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-700 font-semibold">
                        {profile.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <p className="font-medium">
                        {profile.display_name}
                      </p>

                      <p className="text-sm text-gray-500">
                        @{profile.username}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <span className="text-sm text-gray-500">
                    Community member
                  </span>
                )}

                <span className="text-sm text-gray-500">
                  {new Date(article.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="py-10">
              <ArticleViewer content={article.content} />
            </div>

            <div className="border-t border-gray-800 pt-6">
              <Link
                href="/community"
                className="text-sm font-medium text-blue-400 hover:text-blue-300"
              >
                ← Back to Community articles
              </Link>
            </div>
          </article>
        ) : null}
      </main>
    </div>
  );
}

export default function CommunityArticlePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
          Loading article...
        </div>
      }
    >
      <CommunityArticleContent />
    </Suspense>
  );
}