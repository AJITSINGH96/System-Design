
"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
} from "@xyflow/react";

import type {
  Node,
  Edge,
  NodeProps,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import type {
  ArchitectureDiagramData,
} from "@/components/tiptap/ArchitectureDiagram";

// --------------------------------------------------
// Node data
// --------------------------------------------------

type ArchitectureNodeData = {
  label: string;
};

// --------------------------------------------------
// Architecture Box
// --------------------------------------------------

function ArchitectureNode({
  data,
}: NodeProps<Node<ArchitectureNodeData>>) {
  return (
    <div className="min-w-[150px] rounded-lg border-2 border-blue-400 bg-gray-900 px-4 py-3 text-center shadow-lg">
      <Handle type="target" position={Position.Top} />

      <div className="font-semibold text-white">
        {data.label}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

// --------------------------------------------------
// Text Annotation
// --------------------------------------------------

function TextAnnotationNode({
  data,
}: NodeProps<Node<ArchitectureNodeData>>) {
  return (
    <div className="min-w-[100px] max-w-[280px] rounded border border-dashed border-yellow-400 bg-yellow-100 px-3 py-2 text-gray-900 shadow">
      <div className="whitespace-pre-wrap text-sm font-medium text-gray-900">
        {data.label}
      </div>
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
// Viewer
// --------------------------------------------------

type Props = {
  diagram: ArchitectureDiagramData;
};

export default function ArchitectureDiagramViewer({
  diagram,
}: Props) {
  const nodes = (diagram.nodes ?? []) as Node<ArchitectureNodeData>[];
  const edges = (diagram.edges ?? []) as Edge[];

  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className="my-8 h-[500px] w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnDoubleClick={false}
        fitView
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
          nodeStrokeColor="#64748b"
          maskColor="rgba(0, 0, 0, 0.65)"
          style={{
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
          }}
        />
      </ReactFlow>
    </div>
  );
}
