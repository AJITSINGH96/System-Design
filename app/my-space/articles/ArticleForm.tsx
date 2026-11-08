
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/client";

const ArticleEditor = dynamic(
  () => import("@/components/ArticleEditor"),
  {
    ssr: false,
    loading: () => <p className="text-gray-400">Loading editor...</p>,
  }
);

type Category = {
  id: string;
  name: string;
};

type Topic = {
  id: string;
  title: string;
  category_id: string;
};

type ArticleStatus = "draft" | "published";
type ArticleVisibility = "private" | "public";

type ArticleFormProps = {
  articleId?: string;
};

function generateSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function ArticleForm({ articleId }: ArticleFormProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [userId, setUserId] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [content, setContent] = useState<JSONContent | null>(null);

  const [status, setStatus] = useState<ArticleStatus>("draft");
  const [visibility, setVisibility] =
    useState<ArticleVisibility>("private");

  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadForm() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        if (!active) return;
        setUserId(user.id);

        const [categoryResult, topicResult] = await Promise.all([
          supabase
            .from("user_categories")
            .select("id, name")
            .eq("user_id", user.id)
            .order("name"),

          supabase
            .from("user_topics")
            .select("id, title, category_id")
            .eq("user_id", user.id)
            .order("title"),
        ]);

        if (categoryResult.error) throw categoryResult.error;
        if (topicResult.error) throw topicResult.error;

        if (!active) return;

        setCategories(categoryResult.data ?? []);
        setTopics(topicResult.data ?? []);

        if (articleId) {
          const { data: article, error: articleError } = await supabase
            .from("user_articles")
            .select(
              "id, title, description, category_id, topic_id, content, status, visibility"
            )
            .eq("id", articleId)
            .eq("user_id", user.id)
            .single();

          if (articleError || !article) {
            throw articleError ?? new Error("Article not found.");
          }

          if (!active) return;

          setTitle(article.title);
          setDescription(article.description ?? "");
          setCategoryId(article.category_id ?? "");
          setTopicId(article.topic_id ?? "");
          setContent(article.content as JSONContent);
          setStatus(article.status as ArticleStatus);
          setVisibility(article.visibility as ArticleVisibility);
        }
      } catch (err) {
        console.error("Article form loading error:", err);
        if (active) {
          setError(
            articleId
              ? "Unable to load this article. It may not exist or you may not have access."
              : "Unable to load your categories and topics."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadForm();

    return () => {
      active = false;
    };
  }, [articleId, router, supabase]);

  const filteredTopics = topics.filter(
    (topic) => topic.category_id === categoryId
  );

  async function saveArticle(nextStatus: ArticleStatus) {
    setError("");
    setMessage("");

    if (!userId) {
      setError("Your session has expired. Please log in again.");
      router.replace("/login");
      return;
    }

    if (!title.trim()) {
      setError("Please enter an article title.");
      return;
    }

    const slug = generateSlug(title);

    if (!slug) {
      setError("Please enter a valid article title.");
      return;
    }

    if (!content) {
      setError("The editor is still loading. Please try again.");
      return;
    }

    if (topicId) {
      const validTopic = topics.some(
        (topic) =>
          topic.id === topicId && topic.category_id === categoryId
      );

      if (!validTopic) {
        setError("Please select a valid topic for the chosen category.");
        return;
      }
    }

    setSaving(true);

    try {
      // Find an available slug belonging to this user.
      let uniqueSlug = slug;
      let suffix = 1;

      while (suffix <= 100) {
        let query = supabase
          .from("user_articles")
          .select("id")
          .eq("user_id", userId)
          .eq("slug", uniqueSlug);

        if (articleId) {
          query = query.neq("id", articleId);
        }

        const { data: existing, error: slugError } = await query;

        if (slugError) throw slugError;

        if (!existing || existing.length === 0) break;

        suffix++;
        uniqueSlug = `${slug}-${suffix}`;
      }

      if (suffix > 100) {
        throw new Error("Could not generate a unique article URL.");
      }

      const articleData = {
        user_id: userId,
        title: title.trim(),
        slug: uniqueSlug,
        description: description.trim() || null,
        category_id: categoryId || null,
        topic_id: topicId || null,
        content,
        status: nextStatus,
        visibility,
        updated_at: new Date().toISOString(),
      };

      const result = articleId
        ? await supabase
            .from("user_articles")
            .update(articleData)
            .eq("id", articleId)
            .eq("user_id", userId)
        : await supabase
            .from("user_articles")
            .insert(articleData);

      if (result.error) throw result.error;

      setStatus(nextStatus);
      setMessage(
        nextStatus === "published"
          ? "Article published successfully."
          : "Draft saved successfully."
      );

      setTimeout(() => {
        router.push("/my-space/articles");
        router.refresh();
      }, 900);
    } catch (err) {
      console.error("Article save error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your article. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
        Loading article editor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            System Design <span className="text-blue-400">Hub</span>
          </Link>

          <Link
            href="/my-space/articles"
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800"
          >
            My Articles
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/my-space/articles"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to My Articles
        </Link>

        <div className="mb-8 mt-6">
          <p className="text-sm font-medium text-blue-400">
            PERSONAL WORKSPACE
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {articleId ? "Edit Article" : "Create Article"}
          </h1>
          <p className="mt-2 text-gray-400">
            Write, organize, and publish your system design knowledge.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-lg border border-green-800 bg-green-950/30 p-4 text-sm text-green-300">
            {message}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm">Article title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Designing a Scalable WhatsApp Architecture"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-blue-500"
            />
            <p className="mt-2 text-xs text-gray-500">
              URL slug: {generateSlug(title) || "your-article-slug"}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm">
              Short description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Briefly describe what this article covers..."
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-right text-xs text-gray-500">
              {description.length}/300
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm">Category</label>
              <select
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setTopicId("");
                }}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3"
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="mt-2 text-xs text-yellow-500">
                  You haven't created any personal categories yet.
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm">Topic</label>
              <select
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
                disabled={!categoryId}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 disabled:opacity-50"
              >
                <option value="">No topic</option>
                {filteredTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm">Article content</label>
            <ArticleEditor
              key={articleId ?? "new-article"}
              initialContent={content ?? undefined}
              onChange={setContent}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 rounded-xl border border-gray-800 bg-gray-900/60 p-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Publication status
              </label>
              <p className="mb-3 text-xs text-gray-400">
                Drafts are not shown in Community, even if visibility is public.
              </p>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ArticleStatus)
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Article visibility
              </label>
              <p className="mb-3 text-xs text-gray-400">
                Private articles are visible only to you. Public published
                articles can appear in Community and your public profile.
              </p>
              <select
                value={visibility}
                onChange={(event) =>
                  setVisibility(event.target.value as ArticleVisibility)
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-800 pt-6">
            <button
              type="button"
              onClick={() => router.push("/my-space/articles")}
              className="rounded-lg bg-gray-700 px-5 py-3 hover:bg-gray-600"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => saveArticle("draft")}
              disabled={saving || !content}
              className="rounded-lg bg-gray-700 px-5 py-3 hover:bg-gray-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={() => saveArticle("published")}
              disabled={saving || !content}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Publish Article"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
