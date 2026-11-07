
"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import type {
  ArchitectureDiagramData,
} from "@/components/tiptap/ArchitectureDiagram";

type ArchitectureNodeData = {
  label: string;
};

function ArchitectureNode({
  data,
}: {
  data: ArchitectureNodeData;
}) {
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

const nodeTypes = {
  architecture: ArchitectureNode,
};

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
        <Background />
        <Controls
        showInteractive={false}
        className="architecture-controls"
        />
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
  );
}
