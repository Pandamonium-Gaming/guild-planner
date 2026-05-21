'use client';

import React, { useState } from 'react';
import { getAllGames, GameConfig, GameId } from '@/lib/games';
import { useGame } from '@/contexts/GameContext';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { addUserGame } from '@/lib/gameTracking';
import { ChevronRight, Loader2 } from 'lucide-react';

export function GameSelector() {
  const { setSelectedGame } = useGame();
  const { user } = useAuthContext();
  const games = getAllGames();
  const [loadingGameId, setLoadingGameId] = useState<string | null>(null);

  const handleSelectGame = async (gameId: GameId) => {
    setLoadingGameId(gameId);
    try {
      // Track that user is playing this game
      if (user) {
        await addUserGame(user.id, gameId);
      }
      // Update context
      setSelectedGame(gameId);
    } catch (err) {
      console.error('Error selecting game:', err);
    } finally {
      setLoadingGameId(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-2">Select Your Game</h2>
        <p className="text-slate-400">
          Choose which game you want to organise
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {games.map((game: GameConfig) => (
          <button
            key={game.id}
            onClick={() => handleSelectGame(game.id as GameId)}
            disabled={loadingGameId === game.id}
            className="group relative overflow-hidden rounded-lg border border-slate-700 bg-slate-900/50 p-6 transition-all hover:border-slate-500 hover:bg-slate-900/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Gradient background on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{game.icon}</div>
                {loadingGameId === game.id ? (
                  <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-500 transition-transform group-hover:translate-x-1" />
                )}
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{game.name}</h3>
              <p className="text-sm text-slate-400 mb-4">{game.description}</p>

              {/* Feature badges */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(game.features)
                  .filter(([, enabled]) => enabled)
                  .slice(0, 3)
                  .map(([feature]) => (
                    <span
                      key={feature}
                      className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 capitalize"
                    >
                      {feature}
                    </span>
                  ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

