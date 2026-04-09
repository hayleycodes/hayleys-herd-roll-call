import { supabase } from "../../utils/supabase-client";
import type { Pig } from "./pigs.types";

export type PigFamily = {
  parents: Pig[];
  children: Pig[];
  siblings: Pig[];
  fosterFamily: Pig[];
};

export type PigFamilyEdge =
  | {
      pig: Pig;
      relationship: "parent";
      direction: "up" | "down";
    }
  | {
      pig: Pig;
      relationship: "sibling" | "foster_sibling";
      direction: "peer";
    };

export const getPigFamilyEdges = async (
  pigId: number,
): Promise<PigFamilyEdge[]> => {
  const { data, error } = await supabase
    .from("pig_relationships")
    .select(
      `
      pig_id_a,
      pig_id_b,
      relationship_type,
      a:pigs!pig_id_a (id, name, description, created_at, dob, last_sighted, image_path),
      b:pigs!pig_id_b (id, name, description, created_at, dob, last_sighted, image_path)
    `,
    )
    .or(`pig_id_a.eq.${pigId},pig_id_b.eq.${pigId}`);

  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((r): PigFamilyEdge[] => {
    const isA = r.pig_id_a === pigId;
    const other = isA ? r.b : r.a;

    if (!other) return [];

    switch (r.relationship_type) {
      case "parent":
        return [
          {
            pig: other,
            relationship: "parent",
            direction: isA ? "up" : "down",
          },
        ];

      case "sibling":
      case "foster_sibling":
        return [
          {
            pig: other,
            relationship: r.relationship_type,
            direction: "peer",
          },
        ];
      default:
        return [];
    }
  });
};

export const getPigFamily = async (pigId: number): Promise<PigFamily> => {
  const edges = await getPigFamilyEdges(pigId);

  const parents: Pig[] = [];
  const children: Pig[] = [];
  const siblings: Pig[] = [];
  const fosterFamily: Pig[] = [];

  edges.forEach((edge) => {
    if (edge.relationship === "parent") {
      if (edge.direction === "up") {
        parents.push(edge.pig);
      } else if (edge.direction === "down") {
        children.push(edge.pig);
      }
      return;
    }

    if (edge.relationship === "sibling") {
      siblings.push(edge.pig);
      return;
    }

    if (edge.relationship === "foster_sibling") {
      fosterFamily.push(edge.pig);
      return;
    }
  });

  return {
    parents,
    children,
    siblings,
    fosterFamily,
  };
};
