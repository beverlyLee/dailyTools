'use client';

import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MindMapNode, MindMapEdge } from '@/lib/api';

interface MindMapViewProps {
  nodesData: MindMapNode[];
  edgesData: MindMapEdge[];
}

export default function MindMapView({ nodesData, edgesData }: MindMapViewProps) {
  const nodes: Node[] = useMemo(() => {
    return nodesData.map((node) => ({
      id: node.id,
      type: node.type || 'default',
      data: node.data,
      position: node.position,
      style: {
        borderRadius: '8px',
        padding: '8px 16px',
        border: node.id === 'root' ? 'none' : '2px solid #e5e7eb',
        backgroundColor: node.id === 'root' ? '#2563eb' : '#ffffff',
        color: node.id === 'root' ? '#ffffff' : '#111827',
        fontWeight: node.id === 'root' ? 600 : 500,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      },
    }));
  }, [nodesData]);

  const edges: Edge[] = useMemo(() => {
    return edgesData.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: true,
      style: {
        stroke: '#9ca3af',
        strokeWidth: 2,
      },
    }));
  }, [edgesData]);

  return (
    <div className="h-[500px] w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => (node.id === 'root' ? '#2563eb' : '#e5e7eb')}
          maskColor="rgba(0, 0, 0, 0.05)"
        />
      </ReactFlow>
    </div>
  );
}
