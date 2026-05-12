import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import './TagsPage.css';
import PigCard from '../../components/PigList/PigCard/PigCard';
import Loading from '../../components/ui/Loading/Loading';
import { getAllPigs } from '../../services/pigs.service';
import {
  getAllPigTags,
  getTagDefinitions,
} from '../../services/pig-tags.service';
import type { TagDefinition } from '../../services/pig-tags.service';
import type { Pig } from '../../services/pigs.types';

const TagsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [tagsByPig, setTagsByPig] = useState<Map<number, string[]>>(new Map());
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedTags = searchParams.getAll('tag');

  useEffect(() => {
    const load = async () => {
      try {
        const [allPigs, allTags, tagDefs] = await Promise.all([
          getAllPigs(),
          getAllPigTags(),
          getTagDefinitions(),
        ]);
        setPigs(allPigs);
        setTagsByPig(allTags);
        setTagDefinitions(tagDefs);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSearchParams(
      next.length ? next.map((t) => ['tag', t] as [string, string]) : []
    );
  };

  if (loading) return <Loading />;
  if (error) return <p>{error}</p>;

  // Only show tags that at least one living pig has
  const usedTags = new Set<string>();
  for (const tags of tagsByPig.values()) {
    for (const t of tags) usedTags.add(t);
  }
  const availableTags = tagDefinitions.filter((d) => usedTags.has(d.tag));

  const filteredPigs =
    selectedTags.length > 0
      ? pigs.filter((p) => {
          const pigTags = tagsByPig.get(p.id) ?? [];
          return selectedTags.every((t) => pigTags.includes(t));
        })
      : [];

  return (
    <div className="tagsPage">
      <h2>Filter by Tag</h2>
      <div className="tagsChips">
        {availableTags.map((d) => (
          <button
            key={d.tag}
            className={`tagsChip${selectedTags.includes(d.tag) ? ' tagsChipActive' : ''}`}
            onClick={() => toggleTag(d.tag)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {selectedTags.length > 0 && (
        <div className="tagsResults">
          <p className="tagsCount">
            {filteredPigs.length} pig{filteredPigs.length === 1 ? '' : 's'}
          </p>
          <div className="tagsGrid">
            {filteredPigs.map((pig) => (
              <PigCard key={pig.id} pig={pig} hideLastSeen />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagsPage;
