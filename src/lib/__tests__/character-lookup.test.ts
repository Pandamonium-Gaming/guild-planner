/**
 * Tests for Discord ID-based character lookup functions
 * Critical: Validates disaster recovery resilience via Discord ID
 */

import {
  getCharacterByDiscordId,
  getCharactersByDiscordId,
  getCurrentUserMainCharacter,
  checkCharacterResilience,
} from '../character-lookup';

// Mock Supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

import { supabase } from '../supabase';

describe('Character Lookup - Discord ID Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCharacterByDiscordId', () => {
    const mockDiscordId = '123456789012345678';
    const mockGroupId = 'group-uuid-123';
    const gameSlug = 'aoc';

    const mockCharacter = {
      id: 'char-uuid-1',
      user_id: 'user-uuid-1',
      discord_id: mockDiscordId,
      group_id: mockGroupId,
      game_slug: gameSlug,
      name: 'TestChar',
      is_main: true,
      race: 'Human',
      primary_archetype: 'Mage',
      secondary_archetype: 'Healer',
      level: 50,
      member_professions: [
        { profession: 'Alchemy', specialization: 'Potions' },
      ],
    };

    it('should find main character by Discord ID', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockCharacter,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await getCharacterByDiscordId(mockDiscordId, mockGroupId, gameSlug);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('TestChar');
      expect(result?.discord_id).toBe(mockDiscordId);
      expect(result?.is_main).toBe(true);
      expect(result?.professions).toHaveLength(1);
      
      expect(supabase.from).toHaveBeenCalledWith('members');
      expect(mockFrom.eq).toHaveBeenCalledWith('discord_id', mockDiscordId);
      expect(mockFrom.eq).toHaveBeenCalledWith('group_id', mockGroupId);
      expect(mockFrom.eq).toHaveBeenCalledWith('game_slug', gameSlug);
      expect(mockFrom.eq).toHaveBeenCalledWith('is_main', true);
    });

    it('should return first non-main character when no main character exists', async () => {
      const nonMainChar = { ...mockCharacter, is_main: false, id: 'char-uuid-2' };

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn()
          .mockResolvedValueOnce({ data: null, error: null }) // No main character
          .mockResolvedValueOnce({ data: nonMainChar, error: null }), // First non-main
        limit: jest.fn().mockReturnThis(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await getCharacterByDiscordId(mockDiscordId, mockGroupId, gameSlug);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('char-uuid-2');
      expect(result?.is_main).toBe(false);
    });

    it('should return null when no characters found for Discord ID', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn()
          .mockResolvedValueOnce({ data: null, error: null })
          .mockResolvedValueOnce({ data: null, error: null }),
        limit: jest.fn().mockReturnThis(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await getCharacterByDiscordId(mockDiscordId, mockGroupId, gameSlug);

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: 'PGRST116' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getCharacterByDiscordId(mockDiscordId, mockGroupId, gameSlug);

      expect(result).toBeNull();
      expect(consoleSpy).not.toHaveBeenCalled(); // Error doesn't throw, returns null
      
      consoleSpy.mockRestore();
    });

    it('should handle exceptions gracefully', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getCharacterByDiscordId(mockDiscordId, mockGroupId, gameSlug);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in getCharacterByDiscordId:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should default to aoc game when not specified', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        limit: jest.fn().mockReturnThis(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await getCharacterByDiscordId(mockDiscordId, mockGroupId); // No gameSlug

      expect(mockFrom.eq).toHaveBeenCalledWith('game_slug', 'aoc');
    });
  });

  describe('getCharactersByDiscordId', () => {
    const mockDiscordId = '123456789012345678';
    const mockGroupId = 'group-uuid-123';

    const mockCharacters = [
      {
        id: 'char-uuid-1',
        discord_id: mockDiscordId,
        group_id: mockGroupId,
        game_slug: 'aoc',
        name: 'MainChar',
        is_main: true,
        member_professions: [],
      },
      {
        id: 'char-uuid-2',
        discord_id: mockDiscordId,
        group_id: mockGroupId,
        game_slug: 'aoc',
        name: 'AltChar',
        is_main: false,
        member_professions: [],
      },
    ];

    it('should return all characters for a Discord ID', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };

      // Last call in chain resolves with data
      mockFrom.order
        .mockReturnValueOnce(mockFrom) // First order() call returns this
        .mockResolvedValueOnce({ // Second order() call resolves
          data: mockCharacters,
          error: null,
        });

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await getCharactersByDiscordId(mockDiscordId, mockGroupId, 'aoc');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('MainChar');
      expect(result[1].name).toBe('AltChar');
      
      expect(mockFrom.eq).toHaveBeenCalledWith('discord_id', mockDiscordId);
      expect(mockFrom.eq).toHaveBeenCalledWith('group_id', mockGroupId);
      expect(mockFrom.eq).toHaveBeenCalledWith('game_slug', 'aoc');
      expect(mockFrom.order).toHaveBeenCalledWith('is_main', { ascending: false });
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should work without specifying game slug', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };

      mockFrom.order
        .mockReturnValueOnce(mockFrom)
        .mockResolvedValue({
          data: mockCharacters,
          error: null,
        });

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await getCharactersByDiscordId(mockDiscordId, mockGroupId); // No gameSlug

      expect(result).toHaveLength(2);
      // Should NOT call .eq('game_slug', ...) when gameSlug is undefined
      expect(mockFrom.eq).toHaveBeenCalledWith('discord_id', mockDiscordId);
      expect(mockFrom.eq).toHaveBeenCalledWith('group_id', mockGroupId);
      expect(mockFrom.eq).not.toHaveBeenCalledWith('game_slug', expect.anything());
    });

    it('should return empty array when no characters found', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };

      mockFrom.order
        .mockReturnValueOnce(mockFrom)
        .mockResolvedValue({
          data: null,
          error: null,
        });

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await getCharactersByDiscordId(mockDiscordId, mockGroupId);

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };

      const dbError = { message: 'Database error', code: 'PGRST116' };

      mockFrom.order
        .mockReturnValueOnce(mockFrom)
        .mockResolvedValue({
          data: null,
          error: dbError,
        });

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getCharactersByDiscordId(mockDiscordId, mockGroupId);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in getCharactersByDiscordId:',
        dbError
      );

      consoleSpy.mockRestore();
    });
  });

  describe('checkCharacterResilience', () => {
    const mockCharId = 'char-uuid-123';

    it('should report resilient character with both IDs', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            user_id: 'user-uuid-1',
            discord_id: '123456789012345678',
          },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await checkCharacterResilience(mockCharId);

      expect(result).toEqual({
        hasUserId: true,
        hasDiscordId: true,
        isResilient: true,
      });
    });

    it('should report non-resilient when only user_id exists', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            user_id: 'user-uuid-1',
            discord_id: null,
          },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await checkCharacterResilience(mockCharId);

      expect(result).toEqual({
        hasUserId: true,
        hasDiscordId: false,
        isResilient: false,
      });
    });

    it('should report non-resilient when only discord_id exists', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            user_id: null,
            discord_id: '123456789012345678',
          },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await checkCharacterResilience(mockCharId);

      expect(result).toEqual({
        hasUserId: false,
        hasDiscordId: true,
        isResilient: false,
      });
    });

    it('should report non-resilient when character not found', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await checkCharacterResilience(mockCharId);

      expect(result).toEqual({
        hasUserId: false,
        hasDiscordId: false,
        isResilient: false,
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: 'PGRST116' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await checkCharacterResilience(mockCharId);

      expect(result).toEqual({
        hasUserId: false,
        hasDiscordId: false,
        isResilient: false,
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in checkCharacterResilience:',
        expect.objectContaining({ message: 'Database error' })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getCurrentUserMainCharacter', () => {
    const mockGroupId = 'group-uuid-123';
    const gameSlug = 'aoc';

    const mockAuthUser = {
      id: 'user-uuid-1',
      user_metadata: {
        provider_id: '123456789012345678', // Discord ID
      },
    };

    const mockCharacter = {
      id: 'char-uuid-1',
      user_id: 'user-uuid-1',
      discord_id: '123456789012345678',
      group_id: mockGroupId,
      game_slug: gameSlug,
      name: 'MainChar',
      is_main: true,
      member_professions: [],
    };

    beforeEach(() => {
      // Default mock for auth
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });
    });

    it('should find main character by Discord ID (primary path)', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockCharacter,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await getCurrentUserMainCharacter(mockGroupId, gameSlug);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('MainChar');
      expect(result?.discord_id).toBe('123456789012345678');
      
      // Should use Discord ID lookup first
      expect(mockFrom.eq).toHaveBeenCalledWith('discord_id', '123456789012345678');
      expect(mockFrom.eq).toHaveBeenCalledWith('is_main', true);
    });

    it('should fallback to user_id when Discord ID lookup fails', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn()
          .mockResolvedValueOnce({ data: null, error: null }) // Discord ID lookup fails
          .mockResolvedValueOnce({ data: mockCharacter, error: null }), // user_id lookup succeeds
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await getCurrentUserMainCharacter(mockGroupId, gameSlug);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('MainChar');
      
      // Should try Discord ID first, then user_id
      expect(mockFrom.eq).toHaveBeenCalledWith('discord_id', '123456789012345678');
      expect(mockFrom.eq).toHaveBeenCalledWith('user_id', 'user-uuid-1');
    });

    it('should return first non-main character when no main exists (Discord ID path)', async () => {
      const nonMainChar = { ...mockCharacter, is_main: false };
      
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn()
          .mockResolvedValueOnce({ data: null, error: null }) // No main by Discord ID
          .mockResolvedValueOnce({ data: null, error: null }) // No main by user_id
          .mockResolvedValueOnce({ data: nonMainChar, error: null }), // First non-main by Discord ID
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await getCurrentUserMainCharacter(mockGroupId, gameSlug);

      expect(result).not.toBeNull();
      expect(result?.is_main).toBe(false);
    });

    it('should fallback to user_id for first non-main when Discord ID has none', async () => {
      const nonMainChar = { ...mockCharacter, is_main: false };
      
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn()
          .mockResolvedValueOnce({ data: null, error: null }) // No main by Discord ID
          .mockResolvedValueOnce({ data: null, error: null }) // No main by user_id
          .mockResolvedValueOnce({ data: null, error: null }) // No non-main by Discord ID
          .mockResolvedValueOnce({ data: nonMainChar, error: null }), // First by user_id
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await getCurrentUserMainCharacter(mockGroupId, gameSlug);

      expect(result).not.toBeNull();
      expect(result?.is_main).toBe(false);
      
      // Final fallback should use user_id
      expect(mockFrom.eq).toHaveBeenCalledWith('user_id', 'user-uuid-1');
    });

    it('should return null when user not authenticated', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getCurrentUserMainCharacter(mockGroupId, gameSlug);

      expect(result).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled(); // No DB calls without auth
    });

    it('should work without Discord ID in metadata (user_id only)', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'user-uuid-1',
            user_metadata: {}, // No provider_id
          },
        },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockCharacter,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await getCurrentUserMainCharacter(mockGroupId, gameSlug);

      expect(result).not.toBeNull();
      // Should skip Discord ID lookup and go straight to user_id
      expect(mockFrom.eq).toHaveBeenCalledWith('user_id', 'user-uuid-1');
    });

    it('should return null when no characters found at all', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await getCurrentUserMainCharacter(mockGroupId, gameSlug);

      expect(result).toBeNull();
    });

    it('should handle exceptions gracefully', async () => {
      (supabase.auth.getUser as jest.Mock).mockRejectedValue(
        new Error('Auth service down')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getCurrentUserMainCharacter(mockGroupId, gameSlug);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in getCurrentUserMainCharacter:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should default to aoc game when not specified', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockCharacter, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await getCurrentUserMainCharacter(mockGroupId); // No gameSlug

      expect(mockFrom.eq).toHaveBeenCalledWith('game_slug', 'aoc');
    });
  });
});
