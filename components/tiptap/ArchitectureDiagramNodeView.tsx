"use client";

import {
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";

import ArchitectureDiagramViewer from "@/components/ArchitectureDiagramViewer";
import type {
  ArchitectureDiagramData,
} from "@/components/tiptap/ArchitectureDiagram";

export default function ArchitectureDiagramNodeView({
  node,
  editor,
  getPos,
}: NodeViewProps) {
  const diagram = node.attrs.diagram as ArchitectureDiagramData;

  function editDiagram() {
    const position = getPos();

    if (typeof position !== "number") return;

    const newTab = window.open("/diagram-editor?mode=edit", "_blank");

    if (!newTab) {
      alert("Please allow pop-ups for this website.");
      return;
    }

    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== newTab) return;

      if (event.data?.type === "DIAGRAM_EDITOR_READY") {
        newTab.postMessage(
          {
            type: "LOAD_EXISTING_DIAGRAM",
            diagram,
          },
          window.location.origin
        );
      }

      if (event.data?.type === "ARCHITECTURE_DIAGRAM_UPDATED") {
        const updatedDiagram =
          event.data.diagram as ArchitectureDiagramData;

        const updated = editor.commands.command(({ tr }) => {
          if (typeof position !== "number") return false;

          tr.setNodeMarkup(position, undefined, {
            ...node.attrs,
            diagram: updatedDiagram,
          });

          return true;
        });

        newTab.postMessage(
          {
            type: updated
              ? "ARCHITECTURE_DIAGRAM_UPDATED_ACK"
              : "ARCHITECTURE_DIAGRAM_UPDATE_FAILED",
          },
          window.location.origin
        );

        window.removeEventListener("message", handleMessage);
      }
    }

    window.addEventListener("message", handleMessage);
  }

  function deleteDiagram() {
    const position = getPos();

    if (typeof position !== "number") return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this architecture diagram?"
    );

    if (!confirmed) return;

    editor
      .chain()
      .focus()
      .deleteRange({
        from: position,
        to: position + node.nodeSize,
      })
      .run();
  }

  return (
    <NodeViewWrapper className="my-6">
      <div contentEditable={false}>
        <div className="mb-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={editDiagram}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Edit Diagram
          </button>

          <button
            type="button"
            onClick={deleteDiagram}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete Diagram
          </button>
        </div>

        {diagram?.nodes?.length > 0 ? (
          <ArchitectureDiagramViewer diagram={diagram} />
        ) : (
          <div className="rounded-lg border border-dashed border-gray-600 p-8 text-center text-gray-400">
            Empty architecture diagram
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}