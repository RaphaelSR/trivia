import { useState, useEffect } from "react";
import { useGameMode } from "./useGameMode";

/**
 * Hook para gerenciar PIN de acesso personalizado
 * @returns Objeto com funções de gerenciamento de PIN
 */
export function usePinManagement() {
  const { gameMode } = useGameMode();
  const [customPin, setCustomPin] = useState<string>("");

  // Carrega PIN personalizado do localStorage baseado no modo
  useEffect(() => {
    const savedPin = localStorage.getItem(`trivia-pin-${gameMode}`);
    if (savedPin) {
      setCustomPin(savedPin);
    }
  }, [gameMode]);

  // Salva PIN personalizado no localStorage
  const saveCustomPin = (pin: string) => {
    setCustomPin(pin);
    localStorage.setItem(`trivia-pin-${gameMode}`, pin);
  };

  // Remove PIN personalizado
  const clearCustomPin = () => {
    setCustomPin("");
    localStorage.removeItem(`trivia-pin-${gameMode}`);
  };

  // Verifica se o PIN está correto
  const verifyPin = (inputPin: string): boolean => {
    if (gameMode === "demo") {
      return inputPin === "password123"; // PIN padrão para demo
    }

    if (gameMode === "offline") {
      return customPin ? inputPin === customPin : inputPin === "password123";
    }

    if (gameMode === "online") {
      // Para modo online, o PIN será gerenciado pelo Firebase
      return customPin ? inputPin === customPin : inputPin === "password123";
    }

    return false;
  };

  // Retorna o PIN atual baseado no modo
  const getCurrentPin = (): string => {
    if (gameMode === "demo") {
      return "password123";
    }

    return customPin || "password123";
  };

  // Verifica se tem PIN personalizado configurado
  const hasCustomPin = (): boolean => {
    return gameMode !== "demo" && customPin.length > 0;
  };

  return {
    customPin,
    saveCustomPin,
    clearCustomPin,
    verifyPin,
    getCurrentPin,
    hasCustomPin
  };
}
