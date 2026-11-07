
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
        Loading diagram editor...
      </p>
    ),
  }
);

type DiagramModalProps = {
  initialDiagram?: ArchitectureDiagramData;
  onSave: (diagram: ArchitectureDiagramData) => void;
  onClose: () => void;
};

export default function DiagramModal({
  initialDiagram,
  onSave,
  onClose,
}: DiagramModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3">
      <div className="flex h-[95vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-950 shadow-2xl">

        {/* Fixed header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-700 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Architecture Diagram Designer
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Design your system architecture visually.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Editor area */}
        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <DiagramEditor
            initialDiagram={initialDiagram}
            onSave={onSave}
            onCancel={onClose}
          />
        </div>

      </div>
    </div>
  );
}
