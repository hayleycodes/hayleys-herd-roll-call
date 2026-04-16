import { supabase } from "../../utils/supabase-client";
import type { Pig, RelationshipType } from "./pigs.types";

export type PigFamilyMember = {
  pig: Pig;
  relationshipId: number;
};

export type PigFamily = {
  parents: PigFamilyMember[];
  children: PigFamilyMember[];
  siblings: PigFamilyMember[];
  fosterFamily: PigFamilyMember[];
};

export type PigFamilyEdge =
  | {
      pig: Pig;
      relationshipId: number;
      relationship: "parent";
      direction: "up" | "down";
    }
  | {
      pig: Pig;
      relationshipId: number;
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
      id,
      pig_id_a,
      pig_id_b,
      relationship_type,
      a:pigs!pig_id_a (id, name, description, created_at, dob, last_sighted, image_path, passed_away),
      b:pigs!pig_id_b (id, name, description, created_at, dob, last_sighted, image_path, passed_away)
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
            relationshipId: r.id,
            relationship: "parent",
            direction: isA ? "down" : "up",
          },
        ];

      case "sibling":
      case "foster_sibling":
        return [
          {
            pig: other,
            relationshipId: r.id,
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

  const parents: PigFamilyMember[] = [];
  const children: PigFamilyMember[] = [];
  const siblings: PigFamilyMember[] = [];
  const fosterFamily: PigFamilyMember[] = [];

  edges.forEach((edge) => {
    const member = { pig: edge.pig, relationshipId: edge.relationshipId };

    if (edge.relationship === "parent") {
      if (edge.direction === "up") {
        parents.push(member);
      } else if (edge.direction === "down") {
        children.push(member);
      }
      return;
    }

    if (edge.relationship === "sibling") {
      siblings.push(member);
      return;
    }

    if (edge.relationship === "foster_sibling") {
      fosterFamily.push(member);
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

export const createPigRelationship = async (
  pigIdA: number,
  pigIdB: number,
  relationshipType: RelationshipType,
) => {
  const { error } = await supabase
    .from("pig_relationships")
    .insert({ pig_id_a: pigIdA, pig_id_b: pigIdB, relationship_type: relationshipType });

  if (error) throw new Error(error.message);
};

export const deletePigRelationship = async (id: number) => {
  const { error } = await supabase
    .from("pig_relationships")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
};
