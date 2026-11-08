
"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import ArticleForm from "../../ArticleForm";

function EditMyArticleContent() {
  const params = useParams<{ id: string }>();

  return <ArticleForm articleId={params.id} />;
}

export default function EditMyArticlePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
          Loading article...
        </div>
      }
    >
      <EditMyArticleContent />
    </Suspense>
  );
}
