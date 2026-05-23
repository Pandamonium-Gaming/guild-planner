import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';
import { roleHasPermission, type GroupRole } from '@/lib/permissions';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key);
}

type RequestUserContext = {
  primaryUserId: string | null;
  discordId: string | null;
  candidateUserIds: string[];
};

async function resolveRequestUserContext(
  request: NextRequest,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<RequestUserContext> {
  const candidateUserIds = new Set<string>();
  const nextAuthSession = await auth();
  const discordId = nextAuthSession?.user?.discordId || null;

  if (nextAuthSession?.user?.id) {
    candidateUserIds.add(nextAuthSession.user.id);
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

    return {
      primaryUserId: nextAuthSession.user.id,
      discordId,
      candidateUserIds: Array.from(candidateUserIds),
    };
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return {
      primaryUserId: null,
      discordId: null,
      candidateUserIds: [],
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) {
    return {
      primaryUserId: null,
      discordId: null,
      candidateUserIds: [],
    };
  }

  candidateUserIds.add(user.id);
  return {
    primaryUserId: user.id,
    discordId: null,
    candidateUserIds: Array.from(candidateUserIds),
  };
}

async function requireGroupMembership(
  supabaseAdmin: ReturnType<typeof createClient>,
  groupId: string,
  userIds: string[]
): Promise<{ role: GroupRole } | null> {
  if (userIds.length === 0) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .in('user_id', userIds)
    .neq('role', 'pending')
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify membership: ${error.message}`);
  }

  if (!data || data.role === 'pending') {
    return null;
  }

  return data as { role: GroupRole };
}

const ALLOWED_GROUP_FIELDS = new Set([
  'is_public',
  'recruitment_open',
  'recruitment_message',
  'public_description',
  'approval_required',
  'default_role',
  'group_webhook_url',
  'group_welcome_webhook_url',
  'notify_on_events',
  'notify_on_announcements',
  'aoc_webhook_url',
  'aoc_events_webhook_url',
  'sc_webhook_url',
  'sc_events_webhook_url',
  'ror_webhook_url',
  'ror_events_webhook_url',
  'aoc_announcement_role_id',
  'aoc_events_role_id',
  'sc_announcement_role_id',
  'sc_events_role_id',
  'ror_announcement_role_id',
  'ror_events_role_id',
  'aoc_recruitment_open',
  'sc_recruitment_open',
  'ror_recruitment_open',
  'aoc_recruitment_message',
  'sc_recruitment_message',
  'ror_recruitment_message',
  'aoc_public_description',
  'sc_public_description',
  'ror_public_description',
  'aoc_ranks_enabled',
  'sc_ranks_enabled',
  'ror_ranks_enabled',
  'aoc_custom_ranks',
  'sc_custom_ranks',
  'ror_custom_ranks',
]);

const RECRUITMENT_FIELDS = new Set([
  'recruitment_open',
  'recruitment_message',
  'public_description',
  'approval_required',
  'default_role',
  'aoc_recruitment_open',
  'sc_recruitment_open',
  'ror_recruitment_open',
  'aoc_recruitment_message',
  'sc_recruitment_message',
  'ror_recruitment_message',
  'aoc_public_description',
  'sc_public_description',
  'ror_public_description',
]);

type SettingsMutationPayload =
  | {
      action: 'update_group_fields';
      group_id: string;
      changes: Record<string, unknown>;
    }
  | {
      action: 'update_recruitment_application';
      group_id: string;
      application_id: string;
      status: 'accepted' | 'rejected';
    };

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server missing Supabase service credentials' }, { status: 500 });
  }

  const userContext = await resolveRequestUserContext(request, supabaseAdmin);
  if (userContext.candidateUserIds.length === 0) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as SettingsMutationPayload;
    const groupId = payload.group_id;
    if (!groupId) {
      return NextResponse.json({ error: 'Missing group_id' }, { status: 400 });
    }

    const membership = await requireGroupMembership(supabaseAdmin, groupId, userContext.candidateUserIds);
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const role = membership.role;

    if (payload.action === 'update_group_fields') {
      const changes = payload.changes || {};
      const sanitizedEntries = Object.entries(changes).filter(([key]) => ALLOWED_GROUP_FIELDS.has(key));

      if (sanitizedEntries.length === 0) {
        return NextResponse.json({ error: 'No allowed fields to update' }, { status: 400 });
      }

      const fieldKeys = sanitizedEntries.map(([key]) => key);
      const hasRecruitmentFields = fieldKeys.some((key) => RECRUITMENT_FIELDS.has(key));
      const hasNonRecruitmentFields = fieldKeys.some((key) => !RECRUITMENT_FIELDS.has(key));

      if (hasRecruitmentFields && !roleHasPermission(role, 'recruitment_manage')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (
        hasNonRecruitmentFields &&
        !roleHasPermission(role, 'settings_edit') &&
        !roleHasPermission(role, 'settings_edit_roles')
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const updateData = Object.fromEntries(sanitizedEntries);
      const { error } = await supabaseAdmin
        .from('groups')
        .update(updateData)
        .eq('id', groupId);

      if (error) {
        return NextResponse.json({ error: 'Failed to update group settings', details: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (payload.action === 'update_recruitment_application') {
      if (!roleHasPermission(role, 'recruitment_manage')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { application_id: applicationId, status } = payload;
      if (!applicationId || !status) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('recruitment_applications')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .eq('group_id', groupId);

      if (error) {
        return NextResponse.json({ error: 'Failed to update recruitment application', details: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
