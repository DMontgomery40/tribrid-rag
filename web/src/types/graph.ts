import type { Entity, Relationship, Community } from './generated';

export interface GraphNode extends Entity {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge extends Relationship {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  communities: Community[];
}

export interface GraphViewSettings {
  showLabels: boolean;
  showCommunities: boolean;
  layoutType: 'force' | 'hierarchical' | 'radial';
  nodeSize: number;
  edgeOpacity: number;
}
