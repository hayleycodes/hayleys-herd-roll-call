import { useEffect, useMemo, useState } from 'react';
import type {
  PigFamily,
  PigFamilyMember,
} from '../../services/pig-relationships.service';
import {
  createPigRelationship,
  deletePigRelationship,
} from '../../services/pig-relationships.service';
import type {
  FriendEvent,
  Pig,
  RelationshipType,
  SightingEvent,
} from '../../services/pigs.types';
import { getFriendEvents } from '../../services/pig-friends.service';
import { getSightingEvents } from '../../services/pig-sightings.service';
import { getAllPigsIncludingPassed } from '../../services/pigs.service';
import { computeFriendData, relsForPig } from '../../services/friendship';
import PigCard from '../PigList/PigCard/PigCard';
import PigPicker from '../PigPicker/PigPicker';
import FriendBars from '../FriendBars/FriendBars';
import Panel from '../ui/Panel/Panel';
import Dialog from '../ui/Dialog/Dialog';
import Button from '../ui/Button/Button';
import EmojiButton from '../ui/EmojiButton/EmojiButton';
import './FamilyPanel.css';

type SectionKey = 'parents' | 'children' | 'siblings' | 'fosterFamily';

type Props = {
  family: PigFamily;
  currentPigId: number;
  availablePigs: Pig[];
  onRefresh: () => void;
};

const FamilyPanel = ({
  family,
  currentPigId,
  availablePigs,
  onRefresh,
}: Props) => {
  const [addingSection, setAddingSection] = useState<SectionKey | null>(null);
  const [selectedPigId, setSelectedPigId] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const [deletingMember, setDeletingMember] = useState<{
    member: PigFamilyMember;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Friend data (loaded independently of family relationships) powering the
  // Friends bar chart at the bottom of the panel.
  const [friendEvents, setFriendEvents] = useState<FriendEvent[]>([]);
  const [sightingEvents, setSightingEvents] = useState<SightingEvent[]>([]);
  const [friendPigs, setFriendPigs] = useState<Pig[]>([]);

  useEffect(() => {
    Promise.all([
      getFriendEvents(),
      getSightingEvents(),
      getAllPigsIncludingPassed(),
    ])
      .then(([friends, sightings, pigs]) => {
        setFriendEvents(friends);
        setSightingEvents(sightings);
        setFriendPigs(pigs);
      })
      .catch((err) => console.error('Failed to load friends:', err));
  }, []);

  const { historyEvents, friendPairs } = useMemo(
    () => computeFriendData(friendEvents, sightingEvents, friendPigs),
    [friendEvents, sightingEvents, friendPigs]
  );

  const friendRels = useMemo(
    () => relsForPig(currentPigId, friendPairs),
    [currentPigId, friendPairs]
  );

  const handleAdd = async (section: SectionKey) => {
    if (!selectedPigId) return;
    try {
      setSubmitting(true);
      let pigIdA: number;
      let pigIdB: number;
      let type: RelationshipType;

      if (section === 'parents') {
        pigIdA = selectedPigId;
        pigIdB = currentPigId;
        type = 'parent';
      } else if (section === 'children') {
        pigIdA = currentPigId;
        pigIdB = selectedPigId;
        type = 'parent';
      } else if (section === 'fosterFamily') {
        pigIdA = currentPigId;
        pigIdB = selectedPigId;
        type = 'foster_sibling';
      } else {
        pigIdA = currentPigId;
        pigIdB = selectedPigId;
        type = 'sibling';
      }

      await createPigRelationship(pigIdA, pigIdB, type);
      setAddingSection(null);
      setSelectedPigId('');
      onRefresh();
    } catch (err) {
      console.error('Failed to add relationship:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMember) return;
    try {
      setDeleting(true);
      await deletePigRelationship(deletingMember.member.relationshipId);
      setDeletingMember(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete relationship:', err);
    } finally {
      setDeleting(false);
    }
  };

  const toggleAdding = (section: SectionKey) => {
    if (addingSection === section) {
      setAddingSection(null);
      setSelectedPigId('');
    } else {
      setAddingSection(section);
      setSelectedPigId('');
    }
  };

  const renderSection = (
    section: SectionKey,
    title: string,
    members: PigFamilyMember[],
    emptyText: string,
    relationLabel: string,
    dropUp = false
  ) => (
    <>
      <div className="familySectionHeader">
        <h3>{title}</h3>
        <EmojiButton
          size="sm"
          className="familyAddBtn"
          onClick={() => toggleAdding(section)}
          aria-label={`Add ${relationLabel}`}
        >
          {addingSection === section ? '✕' : '➕'}
        </EmojiButton>
      </div>

      {addingSection === section && (
        <div className="familyAddRow">
          <PigPicker
            pigs={availablePigs}
            selectedPigId={selectedPigId}
            onSelect={setSelectedPigId}
            dropUp={dropUp}
            theme="blue"
          />
          <Button
            variant="family"
            onClick={() => handleAdd(section)}
            disabled={submitting || !selectedPigId}
          >
            {submitting ? 'Saving...' : 'Add'}
          </Button>
        </div>
      )}

      {members.length === 0 && addingSection !== section ? (
        <div className="emptyFamily">
          <p className="muted">{emptyText}</p>
        </div>
      ) : members.length > 0 ? (
        <div className="family">
          {members.map((member) => (
            <div key={member.pig.id} className="relationshipCard">
              {!member.inferred && (
                <EmojiButton
                  className="relationshipDeleteBtn"
                  size="sm"
                  onClick={() =>
                    setDeletingMember({ member, label: relationLabel })
                  }
                >
                  🗑️
                </EmojiButton>
              )}
              <PigCard
                pig={member.pig}
                passed={!!member.pig.passed_away}
                hideLastSeen
              />
            </div>
          ))}
        </div>
      ) : null}
    </>
  );

  return (
    <Panel heading="Family 🌳" theme="blue">
      {renderSection(
        'siblings',
        'Siblings 🐖🤝🐖',
        family.siblings,
        'No siblings recorded',
        'sibling'
      )}
      {renderSection(
        'parents',
        'Parents 🐖⬆️',
        family.parents,
        'No parents recorded',
        'parent'
      )}
      {renderSection(
        'children',
        'Children 🐷⬇️',
        family.children,
        'No children recorded',
        'child',
        true
      )}
      {renderSection(
        'fosterFamily',
        'Foster Family 🫶',
        family.fosterFamily,
        'No foster family recorded',
        'foster family',
        true
      )}

      <div className="familySectionHeader">
        <h3>Friends 💕</h3>
      </div>
      {friendRels.length === 0 ? (
        <div className="emptyFamily">
          <p className="muted">No friends recorded yet 🌱</p>
        </div>
      ) : (
        <FriendBars
          selfId={currentPigId}
          rels={friendRels}
          historyEvents={historyEvents}
        />
      )}

      <Dialog
        isOpen={!!deletingMember}
        onClose={() => setDeletingMember(null)}
        message={
          deletingMember
            ? `Remove ${deletingMember.member.pig.name} as ${deletingMember.label}?`
            : ''
        }
        onConfirm={handleDelete}
        confirmLabel="Remove"
        busy={deleting}
        busyLabel="Removing..."
      />
    </Panel>
  );
};

export default FamilyPanel;
