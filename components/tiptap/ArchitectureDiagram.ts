import { ReactNodeViewRenderer } from "@tiptap/react";
import ArchitectureDiagramNodeView from "./ArchitectureDiagramNodeView";
import { Node, mergeAttributes } from "@tiptap/core";

export type DiagramNode = {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
  };
};

export type DiagramEdge = {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
};

export type ArchitectureDiagramData = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    architectureDiagram: {
      insertArchitectureDiagram: (
        diagram: ArchitectureDiagramData
      ) => ReturnType;
    };
  }
}

const ArchitectureDiagram = Node.create({
  name: "architectureDiagram",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      diagram: {
        default: {
          nodes: [],
          edges: [],
        },
      },
    };
  },
  addNodeView() {
  return ReactNodeViewRenderer(ArchitectureDiagramNodeView);
},

  parseHTML() {
    return [
      {
        tag: 'div[data-type="architecture-diagram"]',
        getAttrs: (element) => {
          const raw = element.getAttribute("data-diagram");

          try {
            return {
              diagram: raw ? JSON.parse(raw) : {
                nodes: [],
                edges: [],
              },
            };
          } catch {
            return {
              diagram: { nodes: [], edges: [] },
            };
          }
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "architecture-diagram",
        "data-diagram": JSON.stringify(HTMLAttributes.diagram),
      }),
    ];
  },

  addCommands() {
    return {
      insertArchitectureDiagram:
        (diagram) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { diagram },
          });
        },
    };
  },
});

export default ArchitectureDiagram;
