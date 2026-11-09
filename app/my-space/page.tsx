
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "@/components/NotificationBell";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);

  const [categoryCount, setCategoryCount] = useState(0);
  const [topicCount, setTopicCount] = useState(0);
  const [articleCount, setArticleCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [avatarMessage, setAvatarMessage] = useState("");
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
        bookmarkCountResult,
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
          .from("article_bookmarks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
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
        bookmarkCountResult,
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
      setBookmarkCount(bookmarkCountResult.count ?? 0);
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
  useEffect(() => {
  if (!avatarMessage) return;

  const timeoutId = window.setTimeout(() => {
    setAvatarMessage("");
  }, 4000);

  return () => {
    window.clearTimeout(timeoutId);
  };
}, [avatarMessage]);

  
async function handleAvatarUpload(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0];
  event.target.value = "";

  if (!file) return;

  setError("");
  setAvatarMessage("");

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    setAvatarMessage("Please select a PNG, JPG, JPEG or WebP image.");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    setAvatarMessage("Image size must be 2 MB or less.");
    return;
  }

  setUploadingAvatar(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Your session has expired. Please log in again.");
    }

    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    const filePath = `${user.id}/${crypto.randomUUID()}.${extensionByType[file.type]}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    if (updateError) {
      // Remove the newly uploaded file if profile update fails.
      await supabase.storage.from("avatars").remove([filePath]);
      throw updateError;
    }

    setProfile((current) =>
      current
        ? { ...current, avatar_url: avatarUrl }
        : current
    );

    setAvatarMessage("Profile picture updated successfully.");
  } catch (err) {
    console.error("Avatar upload error:", err);

    setAvatarMessage(
      err instanceof Error
        ? err.message
        : "Unable to upload your profile picture. Please try again."
    );
  } finally {
    setUploadingAvatar(false);
  }
}


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
  {
    href: "/my-space/bookmarks",
    icon: "🔖",
    title: "My Bookmarks",
    description:
      "Access the public community articles you have saved.",
    count: `${bookmarkCount} bookmarks`,
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
      <Link
        href="/my-space/profile"
        className="text-sm text-gray-400 transition hover:text-blue-400"
        title="View and edit your profile"
      >
        {profile?.display_name}
      </Link>

     <NotificationBell />

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
        {/* Community Profile */}
        <section className="mb-10 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Profile picture with upload button */}
              <div className="relative h-20 w-20 shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile picture"
                    className="h-20 w-20 rounded-full border border-gray-700 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gray-700 bg-blue-600/20 text-2xl font-bold text-blue-400">
                    {profile?.display_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  aria-label="Choose profile picture"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Change profile picture"
                  aria-label="Change profile picture"
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-900 bg-blue-600 text-white shadow-lg transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingAvatar ? (
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-30"
                      />
                      <path
                        d="M21 12a9 9 0 0 0-9-9"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-semibold">
                  {profile?.display_name}
                </h2>

                <p className="mt-1 text-sm text-blue-400">
                  @{profile?.username}
                </p>

                <p className="mt-2 text-sm text-gray-400">
                  {profile?.bio ||
                    "Add a bio to introduce yourself to the community."}
                </p>

                {avatarMessage && (
                  <p
                    className={`mt-2 text-xs ${
                      avatarMessage.includes("successfully")
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                    role="status"
                  >
                    {avatarMessage}
                  </p>
                )}

                <p className="mt-1 text-xs text-gray-500">
                  Click the pencil icon to change your picture.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/users/${encodeURIComponent(profile?.username ?? "")}`}
                className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-medium transition hover:border-blue-500 hover:bg-gray-800"
              >
                View Profile
              </Link>

              <Link
                href="/my-space/profile"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </section>

        {/* Welcome */}
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
        

        {/* Content management */}
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">
            Manage your content
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
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
      </main>
    </div>
  );
}
