import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import type { GameMode } from "../components/ui/ModeSelector";

/**
 * Hook para gerenciar o modo de jogo atual
 * @returns Objeto com o modo atual e funções utilitárias
 */
export function useGameMode() {
  const [searchParams] = useSearchParams();

  const gameMode = useMemo((): GameMode => {
    const mode = searchParams.get("mode") as GameMode;
    return mode && ["demo", "offline", "online"].includes(mode) ? mode : "demo";
  }, [searchParams]);

  const isDemo = gameMode === "demo";
  const isOffline = gameMode === "offline";
  const isOnline = gameMode === "online";

  const getModeDisplayName = (mode: GameMode): string => {
    switch (mode) {
      case "demo":
        return "Modo Demo";
      case "offline":
        return "Play Offline";
      case "online":
        return "Play Online";
      default:
        return "Modo Demo";
    }
  };

  const getModeDescription = (mode: GameMode): string => {
    switch (mode) {
      case "demo":
        return "Dados de teste pré-configurados";
      case "offline":
        return "Criação local sem persistência";
      case "online":
        return "Autenticação e persistência na nuvem";
      default:
        return "Dados de teste pré-configurados";
    }
  };

  return {
    gameMode,
    isDemo,
    isOffline,
    isOnline,
    getModeDisplayName,
    getModeDescription
  };
}
