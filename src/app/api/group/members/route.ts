import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';
import type { GroupRole } from '@/lib/permissions';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key);
}

type RequestUserContext = {
  candidateUserIds: string[];
};

type MemberMutationPayload = {
  action: 'update_rank';
  group_id: string;
  membership_id: string;
  rank: string | null;
} | {
  action: 'update_user_rank';
  group_id: string;
  target_user_id: string;
  rank: string | null;
} | {
  action: 'update_character_rank';
  group_id: string;
  character_id: string;
  rank: string | null;
};

async function resolveRequestUserContext(
  request: NextRequest,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<RequestUserContext> {
  const candidateUserIds = new Set<string>();
  const session = await auth();
  const sessionUserId = session?.user?.id || null;
  const discordId = session?.user?.discordId || null;

  if (sessionUserId) {
    candidateUserIds.add(sessionUserId);
  }

  if (discordId) {
    const { data: linkedUsers, error: linkedUsersError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('discord_id', discordId);

    if (!linkedUsersError) {
      (linkedUsers || []).forEach((linkedUser) => {
        if (linkedUser?.id) {
          candidateUserIds.add(linkedUser.id);
        }
      });
    }
  }

  if (candidateUserIds.size === 0) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (token) {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user }, error: authError } = await userClient.auth.getUser(token);
      if (!authError && user?.id) {
        candidateUserIds.add(user.id);
      }
    }
  }

  return { candidateUserIds: Array.from(candidateUserIds) };
}

async function requireGroupMembership(
  supabaseAdmin: ReturnType<typeof createClient>,
  groupId: string,
  userIds: string[]
): Promise<{ role: GroupRole; user_id: string } | null> {
  if (userIds.length === 0) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('group_members')
    .select('role, user_id')
    .eq('group_id', groupId)
    .in('user_id', userIds)
    .neq('role', 'pending')
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify membership: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data as { role: GroupRole; user_id: string };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('group_id');
  const gameSlug = searchParams.get('game_slug') || 'aoc';

  if (!groupId) {
    return NextResponse.json({ error: 'Missing group_id' }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server missing Supabase service credentials' }, { status: 500 });
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: 'Failed to verify membership', details: membershipError.message }, { status: 500 });
  }

  if (!membership || membership.role === 'pending') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: characters, error: charactersError } = await supabaseAdmin
    .from('members')
    .select(`
      *,
      member_professions (*)
    `)
    .eq('group_id', groupId)
    .eq('game_slug', gameSlug)
    .order('is_main', { ascending: false })
    .order('name');

  if (charactersError) {
    return NextResponse.json({ error: 'Failed to load members', details: charactersError.message }, { status: 500 });
  }

  return NextResponse.json({ members: characters || [] });
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server missing Supabase service credentials' }, { status: 500 });
  }

  try {
    const payload = (await request.json()) as MemberMutationPayload;

    if (payload.action !== 'update_rank' && payload.action !== 'update_user_rank' && payload.action !== 'update_character_rank') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    if (!payload.group_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (payload.action === 'update_rank' && !payload.membership_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (payload.action === 'update_user_rank' && !payload.target_user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (payload.action === 'update_character_rank' && !payload.character_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userContext = await resolveRequestUserContext(request, supabaseAdmin);
    if (userContext.candidateUserIds.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorMembership = await requireGroupMembership(
      supabaseAdmin,
      payload.group_id,
      userContext.candidateUserIds
    );

    if (!actorMembership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (actorMembership.role !== 'admin' && actorMembership.role !== 'officer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (payload.action === 'update_character_rank') {
      const { data: targetCharacter, error: characterError } = await supabaseAdmin
        .from('members')
        .select('id, user_id, group_id')
        .eq('id', payload.character_id)
        .eq('group_id', payload.group_id)
        .maybeSingle();

      if (characterError) {
        return NextResponse.json({ error: 'Failed to resolve character', details: characterError.message }, { status: 500 });
      }

      if (!targetCharacter) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 });
      }

      const isOwnCharacter = !!targetCharacter.user_id && userContext.candidateUserIds.includes(targetCharacter.user_id);
      if (!isOwnCharacter && actorMembership.role !== 'admin' && actorMembership.role !== 'officer') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (!isOwnCharacter && actorMembership.role === 'officer' && targetCharacter.user_id) {
        const { data: targetMembership, error: targetMembershipError } = await supabaseAdmin
          .from('group_members')
          .select('role')
          .eq('group_id', payload.group_id)
          .eq('user_id', targetCharacter.user_id)
          .maybeSingle();

        if (targetMembershipError) {
          return NextResponse.json({ error: 'Failed to resolve target member role', details: targetMembershipError.message }, { status: 500 });
        }

        if (targetMembership && targetMembership.role !== 'member' && targetMembership.role !== 'trial') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const normalizedRank = payload.rank && payload.rank.trim().length > 0 ? payload.rank.trim() : null;

      const { error: characterUpdateError } = await supabaseAdmin
        .from('members')
        .update({ rank: normalizedRank })
        .eq('id', payload.character_id)
        .eq('group_id', payload.group_id);

      if (characterUpdateError) {
        return NextResponse.json({ error: 'Failed to update character rank', details: characterUpdateError.message }, { status: 500 });
      }

      if (targetCharacter.user_id) {
        const { error: memberRankError } = await supabaseAdmin
          .from('group_members')
          .update({ guild_rank: normalizedRank })
          .eq('group_id', payload.group_id)
          .eq('user_id', targetCharacter.user_id);

        if (memberRankError) {
          return NextResponse.json({ error: 'Failed to sync member rank', details: memberRankError.message }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true });
    }

    const targetLookup = payload.action === 'update_rank'
      ? supabaseAdmin
          .from('group_members')
          .select('id, role, user_id')
          .eq('id', payload.membership_id)
          .eq('group_id', payload.group_id)
          .maybeSingle()
      : supabaseAdmin
          .from('group_members')
          .select('id, role, user_id')
          .eq('group_id', payload.group_id)
          .eq('user_id', payload.target_user_id)
          .maybeSingle();

    const { data: targetMembership, error: targetError } = await targetLookup;

    if (targetError) {
      return NextResponse.json({ error: 'Failed to resolve target member', details: targetError.message }, { status: 500 });
    }

    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (actorMembership.role !== 'admin' && userContext.candidateUserIds.includes(targetMembership.user_id)) {
      return NextResponse.json({ error: 'Cannot modify your own rank' }, { status: 403 });
    }

    if (actorMembership.role === 'officer' && targetMembership.role !== 'member' && targetMembership.role !== 'trial') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const normalizedRank = payload.rank && payload.rank.trim().length > 0 ? payload.rank.trim() : null;

    const { error: updateError } = await supabaseAdmin
      .from('group_members')
      .update({ guild_rank: normalizedRank })
      .eq('id', targetMembership.id)
      .eq('group_id', payload.group_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update member rank', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
