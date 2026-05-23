import { CharacterWithProfessions, Clan } from '@/lib/types';
import { CharacterForm, type CharacterFormData } from '@/components/characters/CharacterForm';
import React from 'react';

interface CharacterEditModalProps {
  editingCharacter: CharacterWithProfessions | null;
  onSubmit: (id: string, data: CharacterFormData) => Promise<void>;
  onCancel: () => void;
  gameSlug?: string;
  group?: Clan | null;
}

export function CharacterEditModal({ editingCharacter, onSubmit, onCancel, gameSlug = 'aoc', group = null }: CharacterEditModalProps) {
  if (!editingCharacter) return null;
  return (
    <CharacterForm
      initialData={{
        name: editingCharacter.name,
        race: editingCharacter.race,
        primary_archetype: editingCharacter.primary_archetype,
        secondary_archetype: editingCharacter.secondary_archetype,
        level: editingCharacter.level,
        is_main: editingCharacter.is_main,
        preferred_role: editingCharacter.preferred_role || [],
        rank: editingCharacter.rank,
        subscriber_tier: editingCharacter.subscriber_tier || null,
        subscriber_since: editingCharacter.subscriber_since || null,
        subscriber_ships_month: editingCharacter.subscriber_ships_month || null,
        ror_faction: editingCharacter.ror_faction || null,
        ror_class: editingCharacter.ror_class || null,
      }}
      onSubmit={async (data) => {
        await onSubmit(editingCharacter.id, data);
      }}
      onCancel={onCancel}
      isEditing
      gameSlug={gameSlug}
      characterId={editingCharacter.id}
      group={group}
    />
  );
}

