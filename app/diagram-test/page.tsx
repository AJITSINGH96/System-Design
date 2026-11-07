
"use client";

import dynamic from "next/dynamic";

const DiagramEditor = dynamic(
  () => import("@/components/DiagramEditor"),
  { ssr: false }
);

export default function DiagramTestPage() {
  return (
    <main className="min-h-screen bg-gray-950 p-8 text-white">
      <h1 className="mb-6 text-2xl font-bold">
        Architecture Diagram Editor
      </h1>

      <DiagramEditor />
    </main>
  );
}
