import { supabase } from '../lib/supabase-client';
import type { Pig, RelationshipType } from './pigs.types';

export type PigFamilyMember = {
  pig: Pig;
  relationshipId: number;
  // Foster family is transitive: a pig reached only through another foster
  // sibling (not a direct edge) is flagged so the UI can hide delete, since
  // there's no direct relationship row to remove.
  inferred?: boolean;
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
      relationship: 'parent';
      direction: 'up' | 'down';
    }
  | {
      pig: Pig;
      relationshipId: number;
      relationship: 'sibling' | 'foster_sibling';
      direction: 'peer';
    };

export const getPigFamilyEdges = async (
  pigId: number
): Promise<PigFamilyEdge[]> => {
  const { data, error } = await supabase
    .from('pig_relationships')
    .select(
      `
      id,
      pig_id_a,
      pig_id_b,
      relationship_type,
      a:pigs!pig_id_a (id, name, description, created_at, dob, last_sighted, image_paths, passed_away),
      b:pigs!pig_id_b (id, name, description, created_at, dob, last_sighted, image_paths, passed_away)
    `
    )
    .or(`pig_id_a.eq.${pigId},pig_id_b.eq.${pigId}`);

  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((r): PigFamilyEdge[] => {
    const isA = r.pig_id_a === pigId;
    const other = isA ? r.b : r.a;

    if (!other) return [];

    switch (r.relationship_type) {
      case 'parent':
        return [
          {
            pig: other,
            relationshipId: r.id,
            relationship: 'parent',
            direction: isA ? 'down' : 'up',
          },
        ];

      case 'sibling':
      case 'foster_sibling':
        return [
          {
            pig: other,
            relationshipId: r.id,
            relationship: r.relationship_type,
            direction: 'peer',
          },
        ];
      default:
        return [];
    }
  });
};

// Peer relationships (sibling, foster_sibling) are transitive: everyone in the
// same group belongs to each other's family even without a direct edge. We walk
// the whole graph of the given relationship type and return the connected
// component containing pigId. Direct neighbours stay deletable; anyone reached
// further out is flagged as inferred.
const getPeerFamily = async (
  pigId: number,
  relationshipType: 'sibling' | 'foster_sibling'
): Promise<PigFamilyMember[]> => {
  const { data, error } = await supabase
    .from('pig_relationships')
    .select(
      `
      id,
      pig_id_a,
      pig_id_b,
      a:pigs!pig_id_a (id, name, description, created_at, dob, last_sighted, image_paths, passed_away),
      b:pigs!pig_id_b (id, name, description, created_at, dob, last_sighted, image_paths, passed_away)
    `
    )
    .eq('relationship_type', relationshipType);

  if (error) throw new Error(error.message);

  // Build an undirected adjacency of the peer graph, keeping the pig data and
  // the relationship row id that connects each pair.
  type Neighbour = { pig: Pig; relationshipId: number };
  const adjacency = new Map<number, Neighbour[]>();
  const link = (from: number, to: Pig, relationshipId: number) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push({ pig: to, relationshipId });
  };

  (data ?? []).forEach((r) => {
    if (!r.a || !r.b) return;
    link(r.pig_id_a, r.b as unknown as Pig, r.id);
    link(r.pig_id_b, r.a as unknown as Pig, r.id);
  });

  // BFS out from pigId. Direct neighbours keep their real relationship id and
  // stay deletable; anyone further out is flagged as inferred.
  const members: PigFamilyMember[] = [];
  const visited = new Set<number>([pigId]);
  const queue: { id: number; depth: number }[] = [{ id: pigId, depth: 0 }];

  while (queue.length) {
    const { id, depth } = queue.shift()!;
    for (const neighbour of adjacency.get(id) ?? []) {
      if (visited.has(neighbour.pig.id)) continue;
      visited.add(neighbour.pig.id);
      members.push({
        pig: neighbour.pig,
        relationshipId: neighbour.relationshipId,
        inferred: depth > 0,
      });
      queue.push({ id: neighbour.pig.id, depth: depth + 1 });
    }
  }

  return members;
};

// Siblings are also inferred by blood line: two pigs that share at least one
// parent are (half-)siblings even without a direct sibling edge. We look up
// pigId's parents and return their other children.
const getSharedParentSiblings = async (
  pigId: number,
  excludeIds: Set<number>
): Promise<PigFamilyMember[]> => {
  const { data, error } = await supabase
    .from('pig_relationships')
    .select(
      `
      id,
      pig_id_a,
      pig_id_b,
      b:pigs!pig_id_b (id, name, description, created_at, dob, last_sighted, image_paths, passed_away)
    `
    )
    .eq('relationship_type', 'parent');

  if (error) throw new Error(error.message);

  const rows = data ?? [];

  // pig_id_a is the parent, pig_id_b the child. Find pigId's parents, then
  // everyone else those parents also parent.
  const myParents = new Set(
    rows.filter((r) => r.pig_id_b === pigId).map((r) => r.pig_id_a)
  );

  const members: PigFamilyMember[] = [];
  const seen = new Set<number>();

  rows.forEach((r) => {
    if (!myParents.has(r.pig_id_a)) return;
    if (r.pig_id_b === pigId || excludeIds.has(r.pig_id_b)) return;
    if (seen.has(r.pig_id_b) || !r.b) return;
    seen.add(r.pig_id_b);
    members.push({
      pig: r.b as unknown as Pig,
      relationshipId: r.id,
      inferred: true,
    });
  });

  return members;
};

export const getPigFamily = async (pigId: number): Promise<PigFamily> => {
  const [edges, siblings, fosterFamily] = await Promise.all([
    getPigFamilyEdges(pigId),
    // Siblings: the connected component of chained sibling edges.
    getPeerFamily(pigId, 'sibling'),
    // Foster family: the connected component of chained foster_sibling edges.
    getPeerFamily(pigId, 'foster_sibling'),
  ]);

  const parents: PigFamilyMember[] = [];
  const children: PigFamilyMember[] = [];

  edges.forEach((edge) => {
    const member = { pig: edge.pig, relationshipId: edge.relationshipId };

    if (edge.relationship === 'parent') {
      if (edge.direction === 'up') {
        parents.push(member);
      } else if (edge.direction === 'down') {
        children.push(member);
      }
    }
  });

  // Add half/full siblings inferred from shared parents, skipping anyone
  // already listed via the sibling-edge graph (and the pig itself).
  const knownSiblingIds = new Set(siblings.map((s) => s.pig.id));
  const inferredSiblings = await getSharedParentSiblings(
    pigId,
    knownSiblingIds
  );
  siblings.push(...inferredSiblings);

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
  relationshipType: RelationshipType
) => {
  const { error } = await supabase
    .from('pig_relationships')
    .insert({
      pig_id_a: pigIdA,
      pig_id_b: pigIdB,
      relationship_type: relationshipType,
    });

  if (error) throw new Error(error.message);
};

export const deletePigRelationship = async (id: number) => {
  const { error } = await supabase
    .from('pig_relationships')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};
