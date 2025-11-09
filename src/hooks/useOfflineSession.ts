import { useState, useEffect, useCallback } from "react";
import { useGameMode } from "./useGameMode";
import type { TriviaSession } from "../modules/trivia/types";

export interface OfflineSessionMetadata {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  isActive: boolean;
  mode: "demo" | "offline" | "online";
  duration: number; // em minutos
  isSaved: boolean;
}

export interface OfflineSessionData {
  metadata: OfflineSessionMetadata;
  session: TriviaSession;
}

/**
 * Hook para gerenciar persistência de sessões offline
 * @returns Objeto com funções de gerenciamento de sessões
 */
export function useOfflineSession() {
  const { gameMode } = useGameMode();
  const [currentSession, setCurrentSession] =
    useState<OfflineSessionData | null>(null);
  const [sessionHistory, setSessionHistory] = useState<
    OfflineSessionMetadata[]
  >([]);

  const calculateSessionDuration = useCallback((createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60)); // em minutos
  }, []);

  const loadSessionHistory = useCallback(() => {
    try {
      const history = localStorage.getItem("trivia-session-history");
      if (history) {
        const parsedHistory = JSON.parse(history) as OfflineSessionMetadata[];
        setSessionHistory(parsedHistory);
      }
    } catch (error) {
      console.error("Erro ao carregar histórico de sessões:", error);
    }
  }, []);

  const loadActiveSession = useCallback(() => {
    try {
      const activeSession = localStorage.getItem("trivia-active-session");
      if (activeSession) {
        const parsedSession = JSON.parse(activeSession) as OfflineSessionData;
        setCurrentSession(parsedSession);
      }
    } catch (error) {
      console.error("Erro ao carregar sessão ativa:", error);
    }
  }, []);

  const updateSessionHistory = useCallback(
    (metadata: OfflineSessionMetadata) => {
      try {
        setSessionHistory((prevHistory) => {
          const updatedHistory = prevHistory.filter(
            (s) => s.id !== metadata.id
          );
          updatedHistory.unshift(metadata);

          // Mantém apenas as últimas 20 sessões
          const limitedHistory = updatedHistory.slice(0, 20);

          localStorage.setItem(
            "trivia-session-history",
            JSON.stringify(limitedHistory)
          );

          return limitedHistory;
        });
      } catch (error) {
        console.error("Erro ao atualizar histórico:", error);
      }
    },
    []
  );

  const saveSession = useCallback(
    (session: TriviaSession, sessionName?: string) => {
      try {
        const now = new Date().toISOString();
        const sessionId = session.id || `session-${Date.now()}`;

        // Se não tem nome, usa o nome da sessão ou gera um
        const name =
          sessionName ||
          session.title ||
          `Sessão ${new Date().toLocaleDateString("pt-BR")}`;

        const sessionData: OfflineSessionData = {
          metadata: {
            id: sessionId,
            name,
            createdAt: currentSession?.metadata.createdAt || now,
            lastModified: now,
            isActive: true,
            mode: gameMode,
            duration: calculateSessionDuration(
              currentSession?.metadata.createdAt || now
            ),
            isSaved: true
          },
          session: {
            ...session,
            id: sessionId,
            title: name
          }
        };

        // Salva sessão ativa
        localStorage.setItem(
          "trivia-active-session",
          JSON.stringify(sessionData)
        );

        // Salva sessão completa para histórico
        localStorage.setItem(
          `trivia-session-${sessionId}`,
          JSON.stringify(sessionData)
        );

        setCurrentSession(sessionData);

        // Atualiza histórico
        updateSessionHistory(sessionData.metadata);

        console.log("[useOfflineSession] Sessão salva:", {
          id: sessionId,
          name,
          hasActiveSession: true
        });

        return sessionData;
      } catch (error) {
        console.error("Erro ao salvar sessão:", error);
        return null;
      }
    },
    [currentSession, gameMode, calculateSessionDuration, updateSessionHistory]
  );

  const loadSession = useCallback((sessionId: string): TriviaSession | null => {
    try {
      const history = localStorage.getItem("trivia-session-history");
      if (history) {
        const parsedHistory = JSON.parse(history) as OfflineSessionMetadata[];
        const sessionMeta = parsedHistory.find((s) => s.id === sessionId);

        if (sessionMeta) {
          // Carrega dados completos da sessão (pode estar em storage separado)
          const sessionData = localStorage.getItem(
            `trivia-session-${sessionId}`
          );
          if (sessionData) {
            const parsed = JSON.parse(sessionData) as OfflineSessionData;
            return parsed.session;
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Erro ao carregar sessão:", error);
      return null;
    }
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    try {
      // Remove do histórico
      setSessionHistory((prevHistory) => {
        const updatedHistory = prevHistory.filter((s) => s.id !== sessionId);
        localStorage.setItem(
          "trivia-session-history",
          JSON.stringify(updatedHistory)
        );
        return updatedHistory;
      });

      // Remove dados completos
      localStorage.removeItem(`trivia-session-${sessionId}`);

      // Se era a sessão ativa, limpa
      setCurrentSession((prevSession) => {
        if (prevSession?.metadata.id === sessionId) {
          localStorage.removeItem("trivia-active-session");
          return null;
        }
        return prevSession;
      });
    } catch (error) {
      console.error("Erro ao deletar sessão:", error);
    }
  }, []);

  const clearActiveSession = useCallback(() => {
    try {
      localStorage.removeItem("trivia-active-session");
      setCurrentSession(null);
    } catch (error) {
      console.error("Erro ao limpar sessão ativa:", error);
    }
  }, []);

  const getSessionStatus = useCallback(() => {
    if (!currentSession) {
      return {
        hasActiveSession: false,
        sessionName: null,
        duration: 0,
        isSaved: false
      };
    }

    return {
      hasActiveSession: true,
      sessionName: currentSession.metadata.name,
      duration: calculateSessionDuration(currentSession.metadata.createdAt),
      isSaved: currentSession.metadata.isSaved
    };
  }, [currentSession, calculateSessionDuration]);

  // Carrega histórico de sessões do localStorage
  useEffect(() => {
    loadSessionHistory();
  }, [loadSessionHistory]);

  // Carrega sessão ativa se existir
  useEffect(() => {
    if (gameMode === "offline") {
      loadActiveSession();
    }
  }, [gameMode, loadActiveSession]);

  return {
    currentSession,
    sessionHistory,
    saveSession,
    loadSession,
    deleteSession,
    clearActiveSession,
    getSessionStatus,
    updateSessionHistory
  };
}

// Função utilitária para salvar sessão completa (incluindo dados)
export const saveCompleteSession = (sessionData: OfflineSessionData) => {
  try {
    // Salva dados completos
    localStorage.setItem(
      `trivia-session-${sessionData.metadata.id}`,
      JSON.stringify(sessionData)
    );

    // Salva como ativa
    localStorage.setItem("trivia-active-session", JSON.stringify(sessionData));

    return true;
  } catch (error) {
    console.error("Erro ao salvar sessão completa:", error);
    return false;
  }
};
