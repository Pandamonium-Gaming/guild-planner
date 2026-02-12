import Link from 'next/link';
import Image from 'next/image';
import { Home, Settings, LogOut, Archive } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { GameIcon } from '@/components/common/GameIcon';

// Map pages that only exist in specific games to their equivalents in other games
const pageEquivalencyMap: Record<string, Record<string, string>> = {
  'starcitizen': {
    'matrix': 'matrix',      // Both games have matrix
    'fleet': 'matrix',       // AoC doesn't have fleet, use matrix
    'ships': 'matrix',       // AoC doesn't have ships, use matrix
    'settings': 'settings',  // All games have settings
  },
  'aoc': {
    'matrix': 'matrix',      // Both games have matrix
    'fleet': 'fleet',        // AoC doesn't have fleet, go back to characters
    'ships': 'characters',   // AoC doesn't have ships, go to characters
    'settings': 'settings',  // All games have settings
  },
  'ror': {
    'matrix': 'characters',  // RoR doesn't have matrix, go to characters
    'fleet': 'characters',   // RoR doesn't have fleet, go to characters
    'ships': 'characters',   // RoR doesn't have ships, go to characters
    'settings': 'settings',  // All games have settings
  },
};

function getPageForGame(currentPath: string, targetGame: string): string {
  // Extract the page segment from the current path
  // Path format: /groupSlug/gameSlug/page
  const pathSegments = currentPath.split('/').filter(Boolean);
  const currentPage = pathSegments[2] || 'characters';
  
  // Pages that exist in all games - preserve them when switching
  const universalPages = ['characters', 'events', 'settings'];
  if (universalPages.includes(currentPage)) {
    return currentPage;
  }
  
  // Get the equivalent page for the target game, default to characters
  const equivalentPage = pageEquivalencyMap[targetGame]?.[currentPage] || 'characters';
  return equivalentPage;
}

interface GroupHeaderProps {
  groupName: string;
  groupSlug: string;
  gameSlug: string;
  enabledGames: Array<{ slug: string; name: string; icon: string; iconUrl?: string; archived: boolean }>;
  characterCount: number;
  role: string;
  displayName: string;
  onSignOut: () => void;
  guildIconUrl?: string;
}

export function GroupHeader({
  groupName,
  groupSlug,
  gameSlug,
  enabledGames,
  characterCount,
  role,
  displayName,
  onSignOut,
  guildIconUrl,
}: GroupHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const handleGameSwitch = (targetGameSlug: string) => {
    const equivalentPage = getPageForGame(pathname || '', targetGameSlug);
    router.push(`/${groupSlug}/${targetGameSlug}/${equivalentPage}`);
  };
  
  return (
    <header className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 shrink-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Navigation */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-all cursor-pointer"
              title="Home"
            >
              <Home className="w-5 h-5" />
            </Link>
            {guildIconUrl && (
              <Image src={guildIconUrl} alt="Group Icon" width={32} height={32} className="w-8 h-8 rounded-full ring-2 ring-slate-700" />
            )}
            <Link
              href={`/${groupSlug}`}
              className="hover:opacity-80 transition-opacity cursor-pointer"
              title="Return to game selection"
            >
              <div>
                <h1 className="font-display text-base sm:text-lg font-semibold text-white hover:text-indigo-300 transition-colors">
                  {groupName || groupSlug}
                </h1>
                <p className="text-slate-500 text-xs hidden sm:block">
                  {characterCount} characters •
                  <span className={`ml-1 ${
                    role === 'admin' ? 'text-amber-400' :
                    role === 'officer' ? 'text-purple-400' :
                    'text-indigo-400'
                  }`}>
                    {role}
                  </span>
                </p>
              </div>
            </Link>

            {/* Game Switcher */}
            {enabledGames.length > 1 && (
              <div className="hidden sm:flex items-center gap-2 ml-3 pl-3 border-l border-slate-700/50">
                {enabledGames.map((game) => (
                  <button
                    key={game.slug}
                    onClick={() => handleGameSwitch(game.slug)}
                    className={`relative px-2 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1.5 ${
                      gameSlug === game.slug
                        ? 'bg-slate-800/60 text-white ring-1 ring-slate-700/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    } ${game.archived ? 'opacity-60' : ''}`}
                    title={game.archived ? `${game.name} (Archived)` : game.name}
                  >
                    <GameIcon 
                      icon={game.icon}
                      iconUrl={game.iconUrl}
                      alt={game.name}
                      size={24}
                    />
                    <span className="hidden md:inline">{game.name}</span>
                    {game.archived && (
                      <Archive className="inline-block w-3 h-3 ml-1 text-amber-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: User info */}
          <div className="flex items-center gap-2">
            <span className="text-slate-300 text-sm hidden sm:inline">{displayName}</span>
            <Link
              href="/settings"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-all cursor-pointer"
              title="Settings"
            >
              <Settings className="w-[18px] h-[18px]" />
            </Link>
            <button
              onClick={onSignOut}
              className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

