
"use client";

import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction, MouseEvent } from "react";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
} from "@xyflow/react";

import type {
  Node,
  Edge,
  NodeProps,
  Connection,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import type {
  ArchitectureDiagramData,
} from "@/components/tiptap/ArchitectureDiagram";

// --------------------------------------------------
// Types
// --------------------------------------------------

type DiagramNodeData = {
  label: string;
};

type DiagramFlowNode = Node<DiagramNodeData>;

type DiagramEditorProps = {
  initialDiagram?: ArchitectureDiagramData;
  onSave: (diagram: ArchitectureDiagramData) => void;
  onCancel: () => void;
};

// --------------------------------------------------
// Default diagram
// --------------------------------------------------

const defaultNodes: DiagramFlowNode[] = [
  {
    id: "1",
    type: "architecture",
    position: { x: 250, y: 100 },
    data: { label: "API Gateway" },
  },
  {
    id: "2",
    type: "architecture",
    position: { x: 250, y: 300 },
    data: { label: "User Service" },
  },
];

const defaultEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
  },
];

// --------------------------------------------------
// Architecture Box Node
// --------------------------------------------------

function ArchitectureNode({
  id,
  data,
}: NodeProps<DiagramFlowNode>) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label);

  const { updateNodeData } = useReactFlow();

  const saveLabel = () => {
    const updatedLabel = label.trim() || "Untitled";

    setLabel(updatedLabel);
    updateNodeData(id, { label: updatedLabel });
    setEditing(false);
  };

  return (
    <div
      className="min-w-[150px] rounded-lg border-2 border-blue-400 bg-gray-900 px-4 py-3 text-center shadow-lg"
      onDoubleClick={(event) => {
        event.stopPropagation();
        setEditing(true);
      }}
    >
      <Handle type="target" position={Position.Top} />

      {editing ? (
        <input
          autoFocus
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onBlur={saveLabel}
          onKeyDown={(event) => {
            event.stopPropagation();

            if (event.key === "Enter") {
              saveLabel();
            }

            if (event.key === "Escape") {
              setLabel(data.label);
              setEditing(false);
            }
          }}
          onClick={(event) => event.stopPropagation()}
          className="w-full rounded bg-gray-800 px-2 py-1 text-center text-white outline-none"
        />
      ) : (
        <div className="font-semibold text-white">
          {data.label}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

// --------------------------------------------------
// Free-position Text Annotation Node
// --------------------------------------------------

function TextAnnotationNode({
  id,
  data,
}: NodeProps<DiagramFlowNode>) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label);

  const { updateNodeData } = useReactFlow();

  const saveText = () => {
    const updatedLabel = label.trim() || "Text";

    setLabel(updatedLabel);
    updateNodeData(id, { label: updatedLabel });
    setEditing(false);
  };

  return (
    <div
      className="min-w-[100px] max-w-[280px] rounded border border-dashed border-yellow-400 bg-yellow-100/90 px-3 py-2 text-gray-900 shadow"
      onDoubleClick={(event) => {
        event.stopPropagation();
        setEditing(true);
      }}
    >
      {editing ? (
        <textarea
          autoFocus
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onBlur={saveText}
          onKeyDown={(event) => {
            event.stopPropagation();

            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              saveText();
            }

            if (event.key === "Escape") {
              setLabel(data.label);
              setEditing(false);
            }
          }}
          onClick={(event) => event.stopPropagation()}
          className="min-h-[40px] w-full resize-none bg-transparent text-sm text-gray-900 outline-none"
        />
      ) : (
        <div className="whitespace-pre-wrap text-sm">
          {data.label || "Double-click to edit"}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------
// Node Types
// --------------------------------------------------

const nodeTypes = {
  architecture: ArchitectureNode,
  textAnnotation: TextAnnotationNode,
};

// --------------------------------------------------
// Diagram Canvas
// --------------------------------------------------

type DiagramCanvasProps = {
  nodes: DiagramFlowNode[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<DiagramFlowNode[]>>;
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onConnect: (connection: Connection) => void;
};

function DiagramCanvas({
  nodes,
  edges,
  setNodes,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: DiagramCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();

  // Add text annotation by double-clicking empty canvas.
  const handleCanvasDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;

      // Do not add annotations when double-clicking existing nodes.
      if (
        target.closest(
          ".react-flow__node, .react-flow__edge, .react-flow__controls, .react-flow__minimap, .react-flow__panel"
        )
      ) {
        return;
      }

      // Only respond to the actual empty canvas.
      if (!target.closest(".react-flow__pane")) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newAnnotation: DiagramFlowNode = {
        id: `text-${Date.now()}`,
        type: "textAnnotation",
        position,
        data: {
          label: "Double-click to edit",
        },
      };

      setNodes((currentNodes) => [
        ...currentNodes,
        newAnnotation,
      ]);
    },
    [screenToFlowPosition, setNodes]
  );

  return (
    <div
      className="h-full w-full"
      onDoubleClick={handleCanvasDoubleClick}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#555" gap={20} />

        <Controls
          showInteractive={false}
          className="architecture-controls"
        />

        <MiniMap
          nodeColor={(node) =>
            node.type === "textAnnotation"
              ? "#eab308"
              : "#3b82f6"
          }
          maskColor="rgba(0, 0, 0, 0.6)"
        />
      </ReactFlow>
    </div>
  );
}

// --------------------------------------------------
// Main Diagram Editor Content
// --------------------------------------------------

function DiagramEditorContent({
  initialDiagram,
  onSave,
  onCancel,
}: DiagramEditorProps) {
  const startingNodes: DiagramFlowNode[] =
    initialDiagram?.nodes?.length
      ? (initialDiagram.nodes as DiagramFlowNode[])
      : defaultNodes;

  const startingEdges: Edge[] =
    initialDiagram?.edges?.length
      ? (initialDiagram.edges as Edge[])
      : defaultEdges;

  const [nodes, setNodes, onNodesChange] =
    useNodesState<DiagramFlowNode>(startingNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState<Edge>(startingEdges);

  // Add a new architecture box.
  const addNode = (label: string) => {
    const newNode: DiagramFlowNode = {
      id: `node-${Date.now()}`,
      type: "architecture",
      position: {
        x: 150 + Math.random() * 300,
        y: 100 + Math.random() * 250,
      },
      data: { label },
    };

    setNodes((currentNodes) => [
      ...currentNodes,
      newNode,
    ]);
  };

  // Connect architecture boxes.
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            animated: true,
          },
          currentEdges
        )
      );
    },
    [setEdges]
  );

  // Save complete diagram, including text annotations.
  const handleSave = () => {
    const diagram: ArchitectureDiagramData = {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type || "architecture",
        position: node.position,
        data: {
          label: node.data.label,
        },
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: edge.animated,
      })),
    };

    onSave(diagram);
  };

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-700 bg-gray-900 p-4">
        <div className="mr-4 font-semibold">
          Architecture Diagram
        </div>

        {[
          "Service",
          "Database",
          "Kafka",
          "Redis",
          "Load Balancer",
          "CDN",
          "API Gateway",
          "Storage",
        ].map((label) => (
          <button
            key={label}
            onClick={() => addNode(label)}
            className="rounded bg-blue-600 px-3 py-2 text-sm hover:bg-blue-700"
          >
            + {label}
          </button>
        ))}

        <div className="ml-auto flex gap-2">
          <button
            onClick={onCancel}
            className="rounded bg-gray-700 px-4 py-2 hover:bg-gray-600"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="rounded bg-green-600 px-4 py-2 hover:bg-green-700"
          >
            Save Diagram
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="min-h-0 flex-1">
        <DiagramCanvas
          nodes={nodes}
          edges={edges}
          setNodes={setNodes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
        />
      </div>

      {/* Instructions */}
      <div className="border-t border-gray-700 bg-gray-900 px-4 py-2 text-xs text-gray-400">
        Double-click empty canvas to add text. Double-click a box or text to edit it.
        Drag to move. Connect boxes by dragging between handles.
        Select a node and press Delete to remove it.
      </div>
    </div>
  );
}

// --------------------------------------------------
// Export with ReactFlowProvider
// --------------------------------------------------

export default function DiagramEditor(
  props: DiagramEditorProps
) {
  return (
    <ReactFlowProvider>
      <DiagramEditorContent {...props} />
    </ReactFlowProvider>
  );
}
