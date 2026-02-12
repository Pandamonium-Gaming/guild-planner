'use client';

// Build information for debugging/version tracking
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';
const BUILD_TIMESTAMP = process.env.NEXT_PUBLIC_BUILD_TIMESTAMP || new Date().toISOString();

// Inline footer component for use inside flex layouts
// variant: 'default' = original dark bg (for pages without BottomNav)
// variant: 'matching' = matches BottomNav bg (for pages with BottomNav)
export function InlineFooter({ variant = 'default' }: { variant?: 'default' | 'matching' }) {
  const style = variant === 'matching' 
    ? { 
        background: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(12px)',
      }
    : undefined;
  
  const className = variant === 'default' 
    ? 'border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-sm'
    : '';

  const buildDate = new Date(BUILD_TIMESTAMP).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <footer className={className} style={style}>
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-2 text-[10px] md:text-xs text-slate-500 py-4">
        <div className="flex items-center gap-3 justify-center flex-wrap">
          <a
            href="https://github.com/pandamonium-gaming"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1.5"
          >
            <span>Pandamonium Gaming</span>
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          </a>
          <span className="text-slate-600">|</span>
          <span>&copy; {new Date().getFullYear()} Some Rights Reserved</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="hidden sm:inline">Based on <a href="https://github.com/igonzalezespi/aoc-guild-profession-planner" target="_blank" className="text-indigo-400 hover:text-indigo-300 transition-colors" rel="noopener noreferrer">AoC Guild Profession Planner</a></span>
        </div>
        <div className="text-[9px] md:text-[10px] text-slate-600">
          <span className="inline-flex items-center gap-2">
            <span>v{APP_VERSION}</span>
            <span className="text-slate-700 hidden md:inline">•</span>
            <span className="hidden md:inline" title={BUILD_TIMESTAMP}>Build: {buildDate}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

// Global Footer component - now returns null, each page handles its own footer
export function Footer() {
  return null;
}

