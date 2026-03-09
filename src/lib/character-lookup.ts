/**
 * Character lookup utilities for Discord ID-based queries
 * Phase 3: Discord ID Migration - provides fallback lookups
 */

import { supabase } from './supabase';
import { CharacterWithProfessions } from './types';

/**
 * Find a user's character by Discord ID and group ID
 * Fallback to user_id if discord_id not available (backward compatibility)
 */
export async function getCharacterByDiscordId(
  discordId: string,
  groupId: string,
  gameSlug: string = 'aoc'
): Promise<CharacterWithProfessions | null> {
  try {
    // Primary lookup: by Discord ID (Phase 3 - new resilient method)
    const { data: byDiscord, error: discordError } = await supabase
      .from('members')
      .select(`
        *,
        member_professions (*)
      `)
      .eq('discord_id', discordId)
      .eq('group_id', groupId)
      .eq('game_slug', gameSlug)
      .eq('is_main', true)
      .maybeSingle();

    if (!discordError && byDiscord) {
      return transformCharacter(byDiscord);
    }

    // If no main character, return first non-main
    if (!discordError) {
      const { data: allByDiscord } = await supabase
        .from('members')
        .select(`
          *,
          member_professions (*)
        `)
        .eq('discord_id', discordId)
        .eq('group_id', groupId)
        .eq('game_slug', gameSlug)
        .limit(1)
        .maybeSingle();

      if (allByDiscord) {
        return transformCharacter(allByDiscord);
      }
    }

    return null;
  } catch (err) {
    console.error('Error in getCharacterByDiscordId:', err);
    return null;
  }
}

/**
 * Find all characters for a Discord user in a group
 * Used for multi-character support
 */
export async function getCharactersByDiscordId(
  discordId: string,
  groupId: string,
  gameSlug?: string
): Promise<CharacterWithProfessions[]> {
  try {
    const query = supabase
      .from('members')
      .select(`
        *,
        member_professions (*)
      `)
      .eq('discord_id', discordId)
      .eq('group_id', groupId);

    if (gameSlug) {
      query.eq('game_slug', gameSlug);
    }

    const { data, error } = await query
      .order('is_main', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformCharacter);
  } catch (err) {
    console.error('Error in getCharactersByDiscordId:', err);
    return [];
  }
}

/**
 * Check if character ownership is resilient (has both user_id and discord_id)
 * Used for migration validation
 */
export async function checkCharacterResilience(characterId: string): Promise<{
  hasUserId: boolean;
  hasDiscordId: boolean;
  isResilient: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('user_id, discord_id')
      .eq('id', characterId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return { hasUserId: false, hasDiscordId: false, isResilient: false };
    }

    return {
      hasUserId: !!data.user_id,
      hasDiscordId: data.discord_id !== null,
      isResilient: !!data.user_id && data.discord_id !== null,
    };
  } catch (err) {
    console.error('Error in checkCharacterResilience:', err);
    return { hasUserId: false, hasDiscordId: false, isResilient: false };
  }
}

/**
 * Transform character data to include professions
 */
function transformCharacter(char: any): CharacterWithProfessions {
  return {
    ...char,
    race: char.race || null,
    primary_archetype: char.primary_archetype || null,
    secondary_archetype: char.secondary_archetype || null,
    level: char.level || 1,
    is_main: char.is_main || false,
    professions: char.member_professions || [],
  };
}
