
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type ArticleEditorProps = {
  onChange: (content: object) => void;
};

export default function ArticleEditor({ onChange }: ArticleEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content:
      "<h2>Introduction</h2><p>Start writing your article here...</p>",

    // Capture the initial content
    onCreate: ({ editor }) => {
      onChange(editor.getJSON());
    },

    // Capture every subsequent edit
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },

    editorProps: {
      attributes: {
        class:
          "min-h-[400px] outline-none text-gray-200 leading-8",
      },
    },
  });

  if (!editor) {
    return <p className="text-gray-400">Loading editor...</p>;
  }

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">
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
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700"
        >
          H2
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
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
      </div>

      <div className="bg-gray-950 p-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
