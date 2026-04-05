import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";

import { supabase } from "../../../utils/supabase-client";
import { type Pig } from "../../services/pigs.service";
import PigCard from "../../components/PigList/PigCard/PigCard";
import "./FamilyTreePage.css";

type Relationship = {
  id: number;
  parent_id: number;
  child_id: number;
};

const NODE_WIDTH = 120;
const NODE_HEIGHT = 120;
const X_GAP = 220;
const Y_GAP = 120;

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

const nodeTypes = {
  pigNode: PigNode,
};

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

      if (pigsRes.error) throw pigsRes.error;
      if (relRes.error) throw relRes.error;

      setPigs(pigsRes.data ?? []);
      setRelationships(relRes.data ?? []);
      setLoading(false);
    };

    load();
  }, []);

  const { nodes, edges, unrelatedPigs } = useMemo(() => {
    if (!pigs.length) return { nodes: [], edges: [], unrelatedPigs: [] };

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
      if (visited.has(id)) return;

      const pig = pigs.find((p) => p.id === id);
      if (!pig) return;

      visited.add(id);

      const children = (childrenMap.get(id) || []).filter((childId) =>
        pigs.some((p) => p.id === childId),
      );

      nodes.push({
        id: String(id),
        type: "pigNode",
        position: {
          x: depth * X_GAP,
          y: yCursor,
        },
        data: { pig },
      });

      yCursor += Y_GAP;

      children.forEach((childId) => {
        edges.push({
          id: `${id}-${childId}`,
          source: String(id),
          target: String(childId),
        });

        layout(childId, depth + 1);
      });
    };

    // root detection
    const parentSet = new Set(parentMap.keys());
    const rootIds = pigs.filter((p) => !parentSet.has(p.id)).map((p) => p.id);

    yCursor = 0;
    rootIds.forEach((id) => layout(id, 0));

    // ✅ REAL FIX: unrelated pigs = NOT in relationships at all
    const relatedPigIds = new Set<number>();
    relationships.forEach((r) => {
      relatedPigIds.add(r.parent_id);
      relatedPigIds.add(r.child_id);
    });

    const unrelatedPigs = pigs.filter((p) => !relatedPigIds.has(p.id));
    console.log(unrelatedPigs);

    return { nodes, edges, unrelatedPigs };
  }, [pigs, relationships]);

  if (loading) return <div>Loading tree... 🐷</div>;

  return (
    <div className="pageLayout">
      <div className="treeSection">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          defaultEdgeOptions={{
            style: { strokeWidth: 2, stroke: "black" },
          }}
          nodeTypes={nodeTypes}
          fitView
          style={{ width: "100%", height: "100%" }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {unrelatedPigs.length > 0 && (
        <div className="unrelatedSection">
          <h3>Unrelated pigs</h3>
          <div className="unrelatedGrid">
            {unrelatedPigs.map((pig) => (
              <PigCard key={pig.id} pig={pig} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyTreePage;
