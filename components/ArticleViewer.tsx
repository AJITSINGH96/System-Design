
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import type { JSONContent } from "@tiptap/core";

import ArchitectureDiagram from "@/components/tiptap/ArchitectureDiagram";

type ArticleViewerProps = {
  content: JSONContent;
};

export default function ArticleViewer({ content }: ArticleViewerProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "rounded-xl max-w-full h-auto my-6",
        },
      }),
      ArchitectureDiagram,
    ],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none leading-8 text-gray-200",
      },
    },
  });

  if (!editor) {
    return <p className="text-gray-400">Loading article...</p>;
  }

  return <EditorContent editor={editor} />;
}
