import { Clock, Users } from 'lucide-react';
import Image from 'next/image';
import { ROLE_CONFIG, GroupRole } from '@/lib/permissions';

interface ManageTabProps {
  members: Array<{
    id: string;
    user_id: string;
    role: string | null;
    is_creator: boolean;
    user: { display_name: string | null; discord_username: string | null; discord_avatar: string | null } | null;
  }>;
  pendingMembers: Array<{
    id: string;
    user_id: string;
    role: string | null;
    is_creator: boolean;
    user: { display_name: string | null; discord_username: string | null; discord_avatar: string | null } | null;
  }>;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onUpdateRole?: (id: string, role: GroupRole) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
  currentUserId: string;
  currentUserRole: GroupRole;
  t: (key: string) => string;
}

export function ManageTab({
  members,
  pendingMembers,
  onAccept,
  onReject,
  onUpdateRole,
  onRemove,
  currentUserId,
  currentUserRole,
  t,
}: ManageTabProps) {
  return (
    <div className="space-y-6">
      {/* Pending Applications */}
      {pendingMembers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="text-yellow-400" size={20} />
            {t('members.pendingApplications')} ({pendingMembers.length})
          </h2>
          <div className="space-y-2">
            {pendingMembers.map((member) => (
              <div
                key={member.id}
                className="bg-slate-900/80 border border-yellow-500/30 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {member.user?.discord_avatar ? (
                    <Image
                      src={member.user.discord_avatar}
                      alt="Discord avatar"
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-slate-700 rounded-full" />
                  )}
                  <span className="text-white">
                    {member.user?.display_name || member.user?.discord_username || 'Unknown'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onAccept(member.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm cursor-pointer"
                  >
                    {t('members.accept')}
                  </button>
                  <button
                    onClick={() => onReject(member.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm cursor-pointer"
                  >
                    {t('members.reject')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Members */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="text-cyan-400" size={20} />
          {t('members.title')} ({members.length})
        </h2>
        <div className="space-y-2">
          {(() => {
            // Sort members by creator status, role hierarchy, then display name
            const getRoleRank = (role: string | null) => {
              const hierarchy = {
                admin: 4,
                officer: 3,
                member: 2,
                trial: 1,
                pending: 0,
              };
              return role && Object.prototype.hasOwnProperty.call(hierarchy, role)
                ? hierarchy[role as keyof typeof hierarchy]
                : -1;
            };

            const getMemberRank = (member: { role: string | null; is_creator: boolean }) =>
              member.is_creator ? 5 : getRoleRank(member.role);

            const getMemberRoleConfig = (member: { role: string | null; is_creator: boolean }) => {
              if (member.is_creator) return ROLE_CONFIG.admin;
              const validRole = (role: string | null): role is GroupRole =>
                role !== null && Object.prototype.hasOwnProperty.call(ROLE_CONFIG, role);
              const roleKey: GroupRole = validRole(member.role) ? member.role : 'member';
              return ROLE_CONFIG[roleKey];
            };

            return members
              .slice()
              .sort((a, b) => {
                const roleDiff = getMemberRank(b) - getMemberRank(a);
                if (roleDiff !== 0) return roleDiff;
                const nameA = (a.user?.display_name || a.user?.discord_username || '').toLowerCase();
                const nameB = (b.user?.display_name || b.user?.discord_username || '').toLowerCase();
                return nameA.localeCompare(nameB);
              })
              .map((member) => {
                const roleConfig = getMemberRoleConfig(member);
                return (
                  <div
                    key={member.id}
                    className={[
                      "bg-slate-900/80",
                      "backdrop-blur-sm",
                      "rounded-lg",
                      "border",
                      roleConfig.borderColor,
                      "transition-all",
                      "duration-300",
                      "hover:border-slate-600",
                      "p-4",
                      "flex",
                      "items-center",
                      "justify-between"
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      {/* Colored dot for role */}
                      <span className={roleConfig.color}>{String.fromCharCode(9679)}</span>
                    {member.user?.discord_avatar ? (
                      <Image
                        src={member.user.discord_avatar}
                        alt="Discord avatar"
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-700 rounded-full" />
                    )}
                    <div>
                      <span className="text-white">
                        {member.user?.display_name || member.user?.discord_username || 'Unknown'}
                      </span>
                      <span className={`ml-2 text-sm ${roleConfig.color}`}>
                        {member.role}{member.is_creator && ' (creator)'}
                      </span>
                    </div>
                  </div>
                  {onUpdateRole && member.user_id !== currentUserId && (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role || 'member'}
                        onChange={(e) => onUpdateRole(member.id, e.target.value as GroupRole)}
                        className="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-white text-sm cursor-pointer"
                        title={t('members.changeRole')}
                      >
                        {Object.entries(ROLE_CONFIG)
                          .filter(([role]) => role !== 'pending')
                          .filter(([role]) => {
                            // Only allow managing roles below your own
                            if (currentUserRole === 'admin') return true;
                            if (currentUserRole === 'officer') return ['member', 'trial'].includes(role);
                            return false;
                          })
                          .map(([role, config]) => (
                            <option
                              key={role}
                              value={role}
                              title={config.description}
                            >
                              {t(`clan.${role}`) || config.label}
                            </option>
                          ))}
                      </select>
                      {onRemove && (
                        <button
                          onClick={() => onRemove(member.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm cursor-pointer"
                        >
                          {t('members.remove')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )});
          })()}
        </div>
      </div>
    </div>
  );
}

