
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  leetcode_url: string | null;
  linkedin_url: string | null;
};

type Article = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  created_at: string;
};

function getSafeExternalUrl(value: string | null) {
  if (!value?.trim()) return null;

  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`
    );

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function PublicProfileContent() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const [supabase] = useState(() => createClient());

  const [profile, setProfile] = useState<Profile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select(
            "id, username, display_name, bio, avatar_url, leetcode_url, linkedin_url"
          )
          .eq("username", username)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profileData) {
          setProfile(null);
          setArticles([]);
          return;
        }

        setProfile(profileData as Profile);
        setIsOwnProfile(user?.id === profileData.id);

        const { data: articleData, error: articleError } = await supabase
          .from("user_articles")
          .select("id, title, description, slug, created_at")
          .eq("user_id", profileData.id)
          .eq("status", "published")
          .eq("visibility", "public")
          .order("created_at", { ascending: false });

        if (articleError) throw articleError;

        setArticles(articleData ?? []);
      } catch (err) {
        console.error("Profile loading error:", err);
        setError("Unable to load this profile. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (username) {
      loadProfile();
    }
  }, [username, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-6 text-center text-gray-100">
        <div className="text-5xl">👤</div>

        <h1 className="mt-5 text-2xl font-bold">
          Profile not found
        </h1>

        <p className="mt-2 text-gray-400">
          This user profile may not exist.
        </p>

        <Link
          href="/community"
          className="mt-6 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
        >
          ← Back to Community
        </Link>
      </div>
    );
  }

  const leetcodeUrl = getSafeExternalUrl(profile.leetcode_url);
  const linkedinUrl = getSafeExternalUrl(profile.linkedin_url);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            System Design <span className="text-blue-400">Hub</span>
          </Link>

          {isOwnProfile ? (
            <Link
              href="/my-space"
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-blue-400 transition hover:border-blue-500 hover:bg-gray-800"
            >
              ← Back to My Space
            </Link>
          ) : (
            <Link
              href="/community"
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-blue-400 transition hover:border-blue-500 hover:bg-gray-800"
            >
              ← Back to Community
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="h-28 w-28 rounded-full border-2 border-gray-700 object-cover"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-600 text-4xl font-bold text-white">
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold">
                {profile.display_name}
              </h1>

              <p className="mt-2 text-blue-400">
                @{profile.username}
              </p>

              {profile.bio && (
                <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-gray-300">
                  {profile.bio}
                </p>
              )}

              {(leetcodeUrl || linkedinUrl) && (
                <div className="mt-5 flex flex-wrap gap-3">
                  {leetcodeUrl && (
                    <a
                      href={leetcodeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-yellow-400 transition hover:border-yellow-500 hover:bg-gray-800"
                    >
                      <span>⌨️</span>
                      LeetCode
                      <span>↗</span>
                    </a>
                  )}

                  {linkedinUrl && (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-blue-400 transition hover:border-blue-500 hover:bg-gray-800"
                    >
                      <span>in</span>
                      LinkedIn
                      <span>↗</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-7 border-t border-gray-800 pt-5">
            <p className="text-sm text-gray-400">
              <span className="font-semibold text-gray-100">
                {articles.length}
              </span>{" "}
              public {articles.length === 1 ? "article" : "articles"}
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">
            Published articles
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Public articles shared by {profile.display_name}.
          </p>

          {error && (
            <div className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!error && articles.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-gray-700 bg-gray-900/50 px-6 py-12 text-center">
              <div className="text-4xl">📚</div>

              <h3 className="mt-4 text-lg font-semibold">
                No public articles yet
              </h3>

              <p className="mt-2 text-sm text-gray-400">
                This user hasn't published any public articles.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              {articles.map((article) => (
                <article
                  key={article.id}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-blue-500"
                >
                  <h3 className="text-lg font-semibold">
                    {article.title}
                  </h3>

                  {article.description && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                      {article.description}
                    </p>
                  )}

                  <p className="mt-5 text-xs text-gray-500">
                    Published{" "}
                    {new Date(article.created_at).toLocaleDateString()}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function PublicProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
          Loading profile...
        </div>
      }
    >
      <PublicProfileContent />
    </Suspense>
  );
}