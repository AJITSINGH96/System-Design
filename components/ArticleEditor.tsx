
"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/client";

import ArchitectureDiagram from "@/components/tiptap/ArchitectureDiagram";

import type {
  ArchitectureDiagramData,
} from "@/components/tiptap/ArchitectureDiagram";

type ArticleEditorProps = {
  onChange: (content: JSONContent) => void;
  initialContent?: JSONContent;
};

export default function ArticleEditor({
  onChange,
  initialContent,
}: ArticleEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const diagramPositionRef = useRef<number>(0);
  const diagramWindowRef = useRef<Window | null>(null);

  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit,

      Image.configure({
        inline: false,
        allowBase64: false,
      }),

      ArchitectureDiagram,
    ],

    content: initialContent ?? {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Introduction" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Start writing your article here...",
            },
          ],
        },
      ],
    },

    onCreate: ({ editor }) => {
      onChange(editor.getJSON());
    },

    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },

    editorProps: {
      attributes: {
        class: "min-h-[400px] outline-none text-gray-200 leading-8",
      },
    },
  });

  // Receive the diagram from the separate browser tab.
  useEffect(() => {
    function handleDiagramMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.source !== diagramWindowRef.current) {
        return;
      }

      if (
        event.data?.type !== "ARCHITECTURE_DIAGRAM_SAVED" ||
        !event.data.diagram
      ) {
        return;
      }

      if (!editor) {
        (event.source as Window).postMessage(
          { type: "ARCHITECTURE_DIAGRAM_INSERT_FAILED" },
          window.location.origin
        );
        return;
      }

      try {
        const diagram =
          event.data.diagram as ArchitectureDiagramData;

        const position = diagramPositionRef.current;

        const inserted = editor
          .chain()
          .focus()
          .setTextSelection(position)
          .insertArchitectureDiagram(diagram)
          .run();

        if (inserted) {
          console.log("Architecture diagram inserted:", diagram);

          (event.source as Window).postMessage(
            { type: "ARCHITECTURE_DIAGRAM_INSERTED" },
            window.location.origin
          );
        } else {
          console.error("Tiptap could not insert the diagram.");

          (event.source as Window).postMessage(
            { type: "ARCHITECTURE_DIAGRAM_INSERT_FAILED" },
            window.location.origin
          );
        }
      } catch (error) {
        console.error("Diagram insertion failed:", error);

        (event.source as Window).postMessage(
          { type: "ARCHITECTURE_DIAGRAM_INSERT_FAILED" },
          window.location.origin
        );
      }
    }

    window.addEventListener("message", handleDiagramMessage);

    return () => {
      window.removeEventListener("message", handleDiagramMessage);
    };
  }, [editor]);

  // Open the diagram designer in a new browser tab.
  function openNewDiagram() {
    if (!editor) return;

    diagramPositionRef.current = editor.state.selection.from;

    const newTab = window.open("/diagram-editor", "_blank");

    if (!newTab) {
      alert("Please allow pop-ups for this website.");
      return;
    }

    diagramWindowRef.current = newTab;
  }

  // Upload article image into the current user's own folder.
  async function uploadImage(file: File) {
    if (!editor) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("Image size must be less than 5 MB.");
      return;
    }

    const supabase = createClient();

    // Get the currently authenticated user.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      alert("Please log in before uploading an image.");
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");

    // Store the image inside the user's own folder.
    const filePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;

    const { error } = await supabase.storage
      .from("article-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Image upload error:", error);
      alert(`Image upload failed: ${error.message}`);
      return;
    }

    const { data } = supabase.storage
      .from("article-images")
      .getPublicUrl(filePath);

    editor
      .chain()
      .focus()
      .setImage({
        src: data.publicUrl,
        alt: file.name,
      })
      .run();
  }

  if (!editor) {
    return <p className="text-gray-400">Loading editor...</p>;
  }

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-3 border-b border-gray-700 bg-gray-900">

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 font-bold"
        >
          B
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 italic"
        >
          I
        </button>

        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700"
        >
          H2
        </button>

        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700"
        >
          H3
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700"
        >
          • List
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700"
        >
          1. List
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600"
        >
          Insert Image
        </button>

        <button
          type="button"
          onClick={openNewDiagram}
          className="px-3 py-1 rounded bg-purple-700 hover:bg-purple-600"
        >
          + Insert Architecture Diagram
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];

            if (file) {
              await uploadImage(file);
            }

            event.target.value = "";
          }}
        />
      </div>

      {/* Article content */}
      <div className="bg-gray-950 p-6">
        <EditorContent editor={editor} />
      </div>

    </div>
  );
}
