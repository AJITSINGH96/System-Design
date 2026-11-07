
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import type {
  ArchitectureDiagramData,
} from "@/components/tiptap/ArchitectureDiagram";

const DiagramEditor = dynamic(
  () => import("@/components/DiagramEditor"),
  {
    ssr: false,
    loading: () => (
      <p className="p-8 text-gray-400">Loading diagram designer...</p>
    ),
  }
);

export default function DiagramEditorPage() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [initialDiagram, setInitialDiagram] =
    useState<ArchitectureDiagramData | undefined>(undefined);
  const [diagramLoaded, setDiagramLoaded] = useState(false);

  useEffect(() => {
    const editMode = new URLSearchParams(
      window.location.search
    ).get("mode") === "edit";

    setIsEditMode(editMode);

    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== window.opener) return;

      if (
        event.data?.type === "LOAD_EXISTING_DIAGRAM" &&
        event.data.diagram
      ) {
        setInitialDiagram(
          event.data.diagram as ArchitectureDiagramData
        );
        setDiagramLoaded(true);
      }
    }

    window.addEventListener("message", handleMessage);

    if (editMode && window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: "DIAGRAM_EDITOR_READY" },
        window.location.origin
      );
    } else if (!editMode) {
      setDiagramLoaded(true);
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleSave = (diagram: ArchitectureDiagramData) => {
    if (!window.opener || window.opener.closed) {
      alert("Original article editor is not available.");
      return;
    }

    const acknowledgementType = isEditMode
      ? "ARCHITECTURE_DIAGRAM_UPDATED_ACK"
      : "ARCHITECTURE_DIAGRAM_INSERTED";

    const failureType = isEditMode
      ? "ARCHITECTURE_DIAGRAM_UPDATE_FAILED"
      : "ARCHITECTURE_DIAGRAM_INSERT_FAILED";

    const handleAcknowledgement = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== window.opener) return;

      if (event.data?.type === acknowledgementType) {
        window.removeEventListener(
          "message",
          handleAcknowledgement
        );
        window.close();
      }

      if (event.data?.type === failureType) {
        window.removeEventListener(
          "message",
          handleAcknowledgement
        );
        alert(
          "The diagram could not be saved. Please check the original article editor."
        );
      }
    };

    window.addEventListener("message", handleAcknowledgement);

    window.opener.postMessage(
      {
        type: isEditMode
          ? "ARCHITECTURE_DIAGRAM_UPDATED"
          : "ARCHITECTURE_DIAGRAM_SAVED",
        diagram,
      },
      window.location.origin
    );
  };

  const handleCancel = () => {
    window.close();
  };

  if (!diagramLoaded) {
    return (
      <main className="min-h-screen bg-gray-950 p-8 text-gray-300">
        Loading existing diagram...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <div className="mx-auto flex h-[calc(100vh-48px)] max-w-[1600px] flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEditMode
              ? "Edit Architecture Diagram"
              : "Architecture Diagram Designer"}
          </h1>

          <p className="mt-1 text-sm text-gray-400">
            {isEditMode
              ? "Modify your existing architecture diagram and save the changes."
              : "Design your system architecture visually. Save to insert it into your article."}
          </p>
        </div>

        <div className="min-h-0 flex-1">
          <DiagramEditor
            key={isEditMode ? "edit-diagram" : "new-diagram"}
            initialDiagram={initialDiagram}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </main>
  );
}
