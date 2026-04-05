import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
} from "reactflow";
import { type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";

import { supabase } from "../../../utils/supabase-client";
import { type Pig } from "../../services/pigs.service";
import PigCard from "../../components/PigList/PigCard/PigCard";

type Relationship = {
  id: number;
  parent_id: number;
  child_id: number;
};

const PigNode = ({ data }: any) => {
  return (
    <div
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Left} />
      <PigCard pig={data.pig} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

const NODE_WIDTH = 120;
const NODE_HEIGHT = 120;
const X_GAP = 220;
const Y_GAP = 120;

const FamilyTreePage = () => {
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [pigsRes, relRes] = await Promise.all([
        supabase.from("pigs").select("*"),
        supabase.from("pig_relationships").select("*"),
      ]);

      if (pigsRes.error) throw new Error(pigsRes.error.message);
      if (relRes.error) throw new Error(relRes.error.message);

      setPigs(pigsRes.data ?? []);
      setRelationships(relRes.data ?? []);
      setLoading(false);
    };

    load();
  }, []);

  /**
   * SIMPLE TREE LAYOUT (horizontal)
   */
  const { nodes, edges } = useMemo(() => {
    if (!pigs.length) return { nodes: [], edges: [] };

    const childrenMap = new Map<number, number[]>();
    const parentMap = new Map<number, number[]>();

    relationships.forEach((r) => {
      childrenMap.set(r.parent_id, [
        ...(childrenMap.get(r.parent_id) || []),
        r.child_id,
      ]);

      parentMap.set(r.child_id, [
        ...(parentMap.get(r.child_id) || []),
        r.parent_id,
      ]);
    });

    const visited = new Set<number>();
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    let yCursor = 0;

    const layout = (id: number, depth: number) => {
      // 🚨 Step 3 fix: validate node BEFORE marking visited
      if (!pigs.find((p) => p.id === id)) return;

      // 🚨 prevent cycles / repeated traversal
      if (visited.has(id)) return;
      visited.add(id);

      const pig = pigs.find((p) => p.id === id);
      if (!pig) return;

      const children = (childrenMap.get(id) || []).filter((childId) =>
        pigs.some((p) => p.id === childId),
      );

      const y = yCursor;

      nodes.push({
        id: String(id),
        position: {
          x: depth * X_GAP,
          y: yCursor,
        },
        data: { pig },
        type: "pigNode",
      });

      yCursor += Y_GAP;

      children.forEach((childId) => {
        if (pigs.some((p) => p.id === childId)) {
          edges.push({
            id: `${id}-${childId}`,
            source: String(id),
            target: String(childId),
          });
        }

        layout(childId, depth + 1);
      });
    };

    const rootIds = pigs.filter((p) => !parentMap.has(p.id)).map((p) => p.id);

    yCursor = 0;

    rootIds.forEach((id) => layout(id, 0));

    // floating pigs
    pigs.forEach((p) => {
      if (!visited.has(p.id)) {
        nodes.push({
          id: String(p.id),
          position: { x: 0, y: yCursor },
          data: { pig: p },
          type: "pigNode",
        });

        yCursor += Y_GAP;
      }
    });

    return { nodes, edges };
  }, [pigs, relationships]);

  /**
   * Custom Pig Node
   */
  const nodeTypes = useMemo(
    () => ({
      pigNode: PigNode,
    }),
    [],
  );

  if (loading) return <div>Loading tree... 🐷</div>;

  return (
    <div className="treeWrapper" style={{ width: "100%", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export default FamilyTreePage;
