'use client';

import { useState } from 'react';
import { CharactersTab } from '../tabs/CharactersTab';
import { useGameLayoutContext } from '@/contexts/GameLayoutContext';
import { CharacterEditModal } from '../CharacterEditModal';
import { CharacterWithProfessions } from '@/lib/types';
import { DEFAULT_FILTERS, CharacterFilters } from '@/components/characters/CharacterFilters';

export default function CharactersPage() {
  const {
    group,
    characters,
    gameSlug,
    addCharacter,
    updateMember,
    deleteMember,
    updateCharacter,
    setProfessionRank,
  } = useGameLayoutContext();
  
  const [editingCharacter, setEditingCharacter] = useState<CharacterWithProfessions | null>(null);
  const [characterFilters, setCharacterFilters] = useState<CharacterFilters>(DEFAULT_FILTERS);

  if (!group) {
    return null;
  }

  return (
    <>
      <CharactersTab
        groupId={group.id}
        group={group}
        characters={characters}
        addCharacter={addCharacter}
        updateMember={updateMember}
        deleteMember={deleteMember}
        setProfessionRank={setProfessionRank}
        setEditingCharacter={setEditingCharacter}
        characterFilters={characterFilters}
        setCharacterFilters={setCharacterFilters}
        gameSlug={gameSlug}
      />

      <CharacterEditModal
        editingCharacter={editingCharacter}
        onSubmit={async (id, data) => {
          await updateCharacter(id, data);
          setEditingCharacter(null);
        }}
        onCancel={() => setEditingCharacter(null)}
        gameSlug={gameSlug}
        group={group}
      />
    </>
  );
}
