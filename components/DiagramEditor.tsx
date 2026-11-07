
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import type {
  ArchitectureDiagramData,
} from "@/components/tiptap/ArchitectureDiagram";

type ArchitectureNodeData = {
  label: string;
};

type ArchitectureNodeProps = NodeProps<Node<ArchitectureNodeData>> & {
  onLabelChange: (id: string, label: string) => void;
};

type DiagramEditorProps = {
  initialDiagram?: ArchitectureDiagramData;
  onSave: (diagram: ArchitectureDiagramData) => void;
  onCancel: () => void;
};

function ArchitectureNode({
  id,
  data,
  onLabelChange,
}: ArchitectureNodeProps) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label);

  useEffect(() => {
    setLabel(data.label);
  }, [data.label]);

  const saveLabel = () => {
    const newLabel = label.trim() || "Untitled";

    onLabelChange(id, newLabel);
    setLabel(newLabel);
    setEditing(false);
  };

  return (
    <div className="min-w-[150px] rounded-lg border-2 border-blue-400 bg-gray-900 px-4 py-3 text-center shadow-lg">
      <Handle type="target" position={Position.Top} />

      {editing ? (
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={saveLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveLabel();
            }

            if (e.key === "Escape") {
              setLabel(data.label);
              setEditing(false);
            }
          }}
          className="nodrag w-full rounded bg-gray-800 px-2 py-1 text-center text-white outline-none"
        />
      ) : (
        <div
          onDoubleClick={() => setEditing(true)}
          className="cursor-text font-semibold text-white"
          title="Double-click to edit"
        >
          {data.label}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const defaultNodes: Node<ArchitectureNodeData>[] = [
  {
    id: "1",
    type: "architecture",
    position: { x: 250, y: 100 },
    data: { label: "API Gateway" },
  },
  {
    id: "2",
    type: "architecture",
    position: { x: 250, y: 280 },
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

export default function DiagramEditor({
  initialDiagram,
  onSave,
  onCancel,
}: DiagramEditorProps) {

  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialDiagram?.nodes?.length
      ? initialDiagram.nodes as Node<ArchitectureNodeData>[]
      : defaultNodes
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialDiagram?.nodes?.length
      ? initialDiagram.edges
      : defaultEdges
  );

  // Update node label.
  const updateNodeLabel = useCallback(
    (id: string, label: string) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  label,
                },
              }
            : node
        )
      );
    },
    [setNodes]
  );

  const nodeTypes = useMemo(
    () => ({
      architecture: (
        props: NodeProps<Node<ArchitectureNodeData>>
      ) => (
        <ArchitectureNode
          {...props}
          onLabelChange={updateNodeLabel}
        />
      ),
    }),
    [updateNodeLabel]
  );

  // Connect two nodes.
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) =>
        addEdge(connection, currentEdges)
      );
    },
    [setEdges]
  );

  // Add a new component.
  const addNode = (label: string) => {
    const newNode: Node<ArchitectureNodeData> = {
      id: crypto.randomUUID(),
      type: "architecture",
      position: {
        x: 100 + Math.random() * 300,
        y: 100 + Math.random() * 300,
      },
      data: { label },
    };

    setNodes((currentNodes) => [
      ...currentNodes,
      newNode,
    ]);
  };

  // Save diagram as JSON.
  const saveDiagram = () => {
    const diagram: ArchitectureDiagramData = {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type ?? "architecture",
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
    <div className="flex h-full min-h-0 flex-col gap-3">

      {/* Component toolbar */}
      <div className="flex shrink-0 flex-wrap gap-2">
        {[
          "Service",
          "Database",
          "Kafka",
          "Redis",
          "Load Balancer",
          "CDN",
          "API Gateway",
          "Storage",
        ].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => addNode(item)}
            className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700"
          >
            + {item}
          </button>
        ))}
      </div>

      <p className="shrink-0 text-sm text-gray-400">
        Double-click a box to edit its name. Press Enter to save
        or Escape to cancel. Drag boxes to move them and connect
        them using their handles.
      </p>

      {/* Diagram canvas */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-700 bg-gray-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap
            pannable
            zoomable
            bgColor="#111827"
            maskColor="rgba(0, 0, 0, 0.55)"
            nodeColor="#3b82f6"
            nodeStrokeColor="#60a5fa"
            style={{
                backgroundColor: "#111827",
                border: "1px solid #374151",
                borderRadius: "8px",
            }}
            />
        </ReactFlow>
      </div>

      {/* Fixed action buttons */}
      <div className="flex shrink-0 justify-end gap-3 border-t border-gray-700 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-600 px-5 py-2 text-white hover:bg-gray-800"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={saveDiagram}
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-500"
        >
          Save Diagram
        </button>
      </div>

    </div>
  );
}
