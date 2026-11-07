
"use client";

import dynamic from "next/dynamic";

import type {
  ArchitectureDiagramData,
} from "@/components/tiptap/ArchitectureDiagram";

const DiagramEditor = dynamic(
  () => import("@/components/DiagramEditor"),
  {
    ssr: false,
    loading: () => (
      <p className="p-8 text-gray-400">
        Loading diagram designer...
      </p>
    ),
  }
);

export default function DiagramEditorPage() {
  const handleSave = (diagram: ArchitectureDiagramData) => {
    if (!window.opener || window.opener.closed) {
      alert("Original article editor is not available.");
      return;
    }

    // Wait for confirmation from the article editor.
    const handleAcknowledgement = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "ARCHITECTURE_DIAGRAM_INSERTED") {
        window.removeEventListener(
          "message",
          handleAcknowledgement
        );

        window.close();
      }

      if (event.data?.type === "ARCHITECTURE_DIAGRAM_INSERT_FAILED") {
        window.removeEventListener(
          "message",
          handleAcknowledgement
        );

        alert(
          "The diagram could not be inserted. Please check the original article editor."
        );
      }
    };

    window.addEventListener(
      "message",
      handleAcknowledgement
    );

    window.opener.postMessage(
      {
        type: "ARCHITECTURE_DIAGRAM_SAVED",
        diagram,
      },
      window.location.origin
    );
  };

  const handleCancel = () => {
    window.close();
  };

  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <div className="mx-auto flex h-[calc(100vh-48px)] max-w-[1600px] flex-col gap-4">

        <div>
          <h1 className="text-2xl font-bold text-white">
            Architecture Diagram Designer
          </h1>

          <p className="mt-1 text-sm text-gray-400">
            Design your system architecture visually.
            Save to insert it into your article.
          </p>
        </div>

        <div className="min-h-0 flex-1">
          <DiagramEditor
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>

      </div>
    </main>
  );
}
