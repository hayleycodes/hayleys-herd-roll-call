import { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { supabase } from '../../../utils/supabase-client';
import PigCard from '../../components/PigList/PigCard/PigCard';
import './FamilyTreePage.css';
import type { Pig, PigRelationship } from '../../services/pigs.types';
import Loading from '../../components/ui/Loading/Loading';

const NODE_WIDTH = 120;
const NODE_HEIGHT = 150;
const X_GAP = 160;
const Y_GAP = 200;

const PigNode = ({ data }: any) => {
  return (
    <div
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ top: '50%', opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ bottom: '50%', opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ left: '50%', opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ right: '50%', opacity: 0 }}
      />
      <PigCard pig={data.pig} hideLastSeen passed={!!data.pig.passed_away} />
    </div>
  );
};

const nodeTypes = {
  pigNode: PigNode,
};

const FamilyTreePage = () => {
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [relationships, setRelationships] = useState<PigRelationship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [pigsRes, relRes] = await Promise.all([
        supabase.from('pigs').select('*'),
        supabase.from('pig_relationships').select('*'),
      ]);

      if (pigsRes.error) throw pigsRes.error;
      if (relRes.error) throw relRes.error;

      setPigs(pigsRes.data ?? []);
      setRelationships((relRes.data ?? []) as PigRelationship[]);
      setLoading(false);
    };

    load();
  }, []);

  const { nodes, edges } = useMemo(() => {
    if (!pigs.length) return { nodes: [], edges: [] };

    const pigById = new Map(pigs.map((p) => [p.id, p]));

    // Build parent→child and sibling maps
    const childrenMap = new Map<number, number[]>();
    const parentMap = new Map<number, number[]>();
    const siblingPairs: {
      a: number;
      b: number;
      type: 'sibling' | 'foster_sibling';
    }[] = [];

    relationships.forEach((r) => {
      if (r.relationship_type === 'parent') {
        childrenMap.set(r.pig_id_a, [
          ...(childrenMap.get(r.pig_id_a) || []),
          r.pig_id_b,
        ]);
        parentMap.set(r.pig_id_b, [
          ...(parentMap.get(r.pig_id_b) || []),
          r.pig_id_a,
        ]);
      } else if (
        r.relationship_type === 'sibling' ||
        r.relationship_type === 'foster_sibling'
      ) {
        siblingPairs.push({
          a: r.pig_id_a,
          b: r.pig_id_b,
          type: r.relationship_type,
        });
      }
    });

    // Undirected adjacency to find family groups
    const adj = new Map<number, Set<number>>();
    const addAdj = (a: number, b: number) => {
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a)!.add(b);
      adj.get(b)!.add(a);
    };
    relationships.forEach((r) => addAdj(r.pig_id_a, r.pig_id_b));

    // Find connected components (family groups)
    const visited = new Set<number>();
    const families: number[][] = [];
    for (const id of adj.keys()) {
      if (visited.has(id) || !pigById.has(id)) continue;
      const group: number[] = [];
      const stack = [id];
      while (stack.length) {
        const curr = stack.pop()!;
        if (visited.has(curr)) continue;
        visited.add(curr);
        group.push(curr);
        (adj.get(curr) || new Set()).forEach((n) => {
          if (!visited.has(n) && pigById.has(n)) stack.push(n);
        });
      }
      families.push(group);
    }

    const freePigs = pigs.filter((p) => !adj.has(p.id));

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const placed = new Map<number, { x: number; y: number }>();

    // Classic top-down tree layout:
    // - depth = row (y axis), parents above children
    // - siblings side by side (x axis)
    // - each family group stacked below the previous one

    const leafCount = (id: number, v: Set<number>): number => {
      if (v.has(id)) return 0;
      v.add(id);
      const children = (childrenMap.get(id) || []).filter((c) =>
        pigById.has(c)
      );
      if (children.length === 0) return 1;
      return children.reduce((sum, c) => sum + leafCount(c, v), 0);
    };

    // Layout subtree top-down with a yBase offset.
    // Returns the max depth used.
    const layoutSubtree = (
      id: number,
      depth: number,
      xSlot: number,
      yBase: number,
      v: Set<number>
    ): { width: number; deepest: number } => {
      if (v.has(id)) return { width: 0, deepest: depth };
      const pig = pigById.get(id);
      if (!pig) return { width: 0, deepest: depth };
      v.add(id);

      const children = (childrenMap.get(id) || []).filter((c) =>
        pigById.has(c)
      );
      const width =
        children.length === 0
          ? 1
          : children.reduce((sum, c) => sum + leafCount(c, new Set(v)), 0);

      const x = (xSlot + width / 2) * X_GAP;
      const y = yBase + depth * Y_GAP;

      nodes.push({
        id: String(id),
        type: 'pigNode',
        position: { x, y },
        data: { pig },
      });
      placed.set(id, { x, y });

      let childX = xSlot;
      let deepest = depth;
      children.forEach((childId) => {
        edges.push({
          id: `parent-${id}-${childId}`,
          source: String(id),
          target: String(childId),
          sourceHandle: 'bottom',
          targetHandle: 'top',
          type: 'smoothstep',
        });
        const w = leafCount(childId, new Set(v));
        const result = layoutSubtree(childId, depth + 1, childX, yBase, v);
        deepest = Math.max(deepest, result.deepest);
        childX += w;
      });

      return { width, deepest };
    };

    let nextYBase = 0;
    const FAMILY_Y_GAP = 60; // px gap between family groups

    families.forEach((family) => {
      const hasParentSet = new Set(parentMap.keys());

      const roots = family.filter((id) => !hasParentSet.has(id));
      const treeRoots = roots.filter(
        (id) => childrenMap.has(id) || parentMap.has(id)
      );
      const peerOnly = family.filter(
        (id) => !childrenMap.has(id) && !parentMap.has(id)
      );

      const treeVisited = new Set<number>();
      let xSlot = 0;
      let deepest = 0;

      // Layout parent→child trees side by side
      treeRoots.forEach((id) => {
        const result = layoutSubtree(id, 0, xSlot, nextYBase, treeVisited);
        xSlot += result.width;
        deepest = Math.max(deepest, result.deepest);
      });

      // Place peer-only members next to their foster/sibling connections
      // Find which row their connections are on, and place them on the same row
      const familySet = new Set(family);
      peerOnly.forEach((id) => {
        if (placed.has(id)) return;
        const pig = pigById.get(id)!;

        // Find the row of the connected placed pig (foster or sibling)
        let targetRow = -1;
        siblingPairs.forEach(({ a, b }) => {
          if (!familySet.has(a) || !familySet.has(b)) return;
          const other = a === id ? b : b === id ? a : null;
          if (other !== null && placed.has(other)) {
            const pos = placed.get(other)!;
            const row = Math.round((pos.y - nextYBase) / Y_GAP);
            if (targetRow === -1) targetRow = row;
            else targetRow = Math.min(targetRow, row); // place on the highest connected row
          }
        });

        const row = targetRow >= 0 ? targetRow : deepest > 0 ? deepest + 1 : 0;
        const x = (xSlot + 0.5) * X_GAP;
        const y = nextYBase + row * Y_GAP;
        nodes.push({
          id: String(id),
          type: 'pigNode',
          position: { x, y },
          data: { pig },
        });
        placed.set(id, { x, y });
        xSlot += 1;
        deepest = Math.max(deepest, row);
      });

      // Move yBase down past this family
      nextYBase += deepest * Y_GAP + NODE_HEIGHT + FAMILY_Y_GAP;
    });

    // Free-floating pigs in a row at the bottom
    if (freePigs.length) {
      freePigs.forEach((pig, i) => {
        const x = (i + 0.5) * X_GAP;
        const y = nextYBase;
        nodes.push({
          id: String(pig.id),
          type: 'pigNode',
          position: { x, y },
          data: { pig },
        });
        placed.set(pig.id, { x, y });
      });
    }

    // Add sibling/foster edges
    siblingPairs.forEach(({ a, b, type }) => {
      if (placed.has(a) && placed.has(b)) {
        if (type === 'foster_sibling') {
          const posA = placed.get(a)!;
          const posB = placed.get(b)!;
          const sameRow = posA.y === posB.y;
          if (sameRow) {
            // Same row — horizontal dashed line
            edges.push({
              id: `${type}-${a}-${b}`,
              source: String(a),
              target: String(b),
              type: 'straight',
              sourceHandle: 'right',
              targetHandle: 'left',
              style: { strokeDasharray: '5 5', stroke: '#fff', strokeWidth: 3 },
            });
          } else {
            // Different rows — vertical dashed line
            const aAbove = posA.y < posB.y;
            edges.push({
              id: `${type}-${a}-${b}`,
              source: String(aAbove ? a : b),
              target: String(aAbove ? b : a),
              sourceHandle: 'bottom',
              targetHandle: 'top',
              type: 'smoothstep',
              style: { strokeDasharray: '5 5', stroke: '#fff', strokeWidth: 3 },
            });
          }
        } else {
          // Sibling edges go left→right on the same row
          edges.push({
            id: `${type}-${a}-${b}`,
            source: String(a),
            target: String(b),
            type: 'straight',
            sourceHandle: 'right',
            targetHandle: 'left',
          });
        }
      }
    });

    return { nodes, edges };
  }, [pigs, relationships]);

  if (loading) return <Loading />;

  return (
    <div className="pageLayout">
      <div className="treeSection">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { strokeWidth: 3, stroke: '#fff' },
          }}
          nodeTypes={nodeTypes}
          fitView
          style={{ width: '100%', height: '100%' }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export default FamilyTreePage;
