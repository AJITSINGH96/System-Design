
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { ReactNode } from "react";

type ArticleNode = {
  type?: string;
  text?: string;
  attrs?: {
    level?: number;
  };
  marks?: {
    type: string;
  }[];
  content?: ArticleNode[];
};

type Article = {
  id: string;
  title: string;
  slug: string;
  content: ArticleNode;
  created_at: string;
};

// Render individual Tiptap nodes
function renderNode(node: ArticleNode, index: number): ReactNode {
  if (node.type === "text") {
    let result: ReactNode = node.text ?? "";

    node.marks?.forEach((mark) => {
      switch (mark.type) {
        case "bold":
          result = <strong>{result}</strong>;
          break;
        case "italic":
          result = <em>{result}</em>;
          break;
        case "code":
          result = (
            <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300">
              {result}
            </code>
          );
          break;
        case "strike":
          result = <s>{result}</s>;
          break;
        case "underline":
          result = <u>{result}</u>;
          break;
      }
    });

    return <span key={index}>{result}</span>;
  }

  const children = node.content?.map((child, i) =>
    renderNode(child, i)
  );

  switch (node.type) {
    case "doc":
      return <div key={index}>{children}</div>;

    case "paragraph":
      return (
        <p key={index} className="text-gray-300 leading-8 mb-5">
          {children}
        </p>
      );

    case "heading": {
      const level = node.attrs?.level ?? 2;

      if (level === 1) {
        return (
          <h1 key={index} className="text-3xl font-bold mt-10 mb-5">
            {children}
          </h1>
        );
      }

      if (level === 3) {
        return (
          <h3 key={index} className="text-xl font-semibold mt-8 mb-4">
            {children}
          </h3>
        );
      }

      return (
        <h2 key={index} className="text-2xl font-bold mt-10 mb-5">
          {children}
        </h2>
      );
    }

    case "bulletList":
      return (
        <ul key={index} className="list-disc pl-8 mb-6 space-y-2 text-gray-300">
          {children}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={index} className="list-decimal pl-8 mb-6 space-y-2 text-gray-300">
          {children}
        </ol>
      );

    case "listItem":
      return <li key={index}>{children}</li>;

    case "blockquote":
      return (
        <blockquote
          key={index}
          className="border-l-4 border-blue-500 pl-5 italic text-gray-400 my-6"
        >
          {children}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre key={index} className="bg-gray-900 border border-gray-800 rounded-lg p-5 overflow-x-auto mb-6">
          <code>{children}</code>
        </pre>
      );

    case "hardBreak":
      return <br key={index} />;

    case "horizontalRule":
      return <hr key={index} className="border-gray-700 my-8" />;

    default:
      return <div key={index}>{children}</div>;
  }
}

function ArticleContent() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchArticle() {
      try {
        setLoading(true);
        setError("");

        const { data, error } = await supabase
          .from("articles")
          .select("id, title, slug, content, created_at")
          .eq("slug", slug)
          .eq("status", "published")
          .single();

        if (error) throw error;

        setArticle(data as Article);
      } catch (err) {
        console.error("Article fetch error:", err);
        setError("Unable to load this article.");
      } finally {
        setLoading(false);
      }
    }

    fetchArticle();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 p-10">
        Loading article...
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 p-10">
        <p className="text-red-400">
          {error || "Article not found."}
        </p>
        <Link href="/" className="text-blue-400 mt-4 inline-block">
          Back to home
        </Link>
      </main>
    );
  }

  const content = article.content;

  const isTiptapContent =
    content?.type === "doc" && Array.isArray(content.content);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="h-16 border-b border-gray-800 flex items-center px-6">
        <Link href="/" className="text-xl font-bold">
          System Design Hub
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to home
        </Link>

        <p className="text-gray-500 text-sm mt-10 mb-4">
          Published{" "}
          {new Date(article.created_at).toLocaleDateString()}
        </p>

        <h1 className="text-4xl font-bold mb-8">
          {article.title}
        </h1>

        <article className="border-t border-gray-800 pt-8">
          {isTiptapContent ? (
            content.content!.map((node, index) =>
              renderNode(node, index)
            )
          ) : (
            // Support your older JSON article format
            <div className="space-y-8">
              {Object.entries(content ?? {}).map(([key, value]) => (
                <section key={key}>
                  <h2 className="text-2xl font-semibold mb-3 capitalize">
                    {key.replace(/([A-Z])/g, " $1")}
                  </h2>
                  <p className="text-gray-300 leading-8">
                    {String(value)}
                  </p>
                </section>
              ))}
            </div>
          )}
        </article>
      </main>
    </div>
  );
}

export default function ArticlePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-950 text-gray-100 p-10">
          Loading article...
        </main>
      }
    >
      <ArticleContent />
    </Suspense>
  );
}
