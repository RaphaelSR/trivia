import { useState, useEffect } from "react";
import type { TriviaParticipant } from "@/modules/trivia/types";
import type {
  PointDistribution,
  QuickScoringOption
} from "../types/control.types";

type FlexibleScoringMode = "quick" | "advanced";
import {
  applyQuickScoringOption,
  updateTeamDistribution as updateTeamDistributionUtil,
  getTeamParticipants as getTeamParticipantsUtil,
  isValidScoring
} from "../utils/scoringUtils";

/**
 * Hook para gerenciar sistema de pontuação
 */
export function useScoringSystem(
  participants: TriviaParticipant[],
  activeTeamId: string | null,
  activeParticipantId: string | null,
  basePoints: number
) {
  const [mode, setMode] = useState<FlexibleScoringMode>("quick");
  const [distributions, setDistributions] = useState<PointDistribution[]>([]);
  const [selectedMultiplier, setSelectedMultiplier] = useState<number>(1.0);
  const [quickModeSelected, setQuickModeSelected] = useState<boolean>(false);
  const [selectedQuickOption, setSelectedQuickOption] = useState<string | null>(
    null
  );

  const quickOptions: QuickScoringOption[] = [
    {
      id: "full-current",
      title: "Valor cheio",
      subtitle: "Time da vez recebe 100%",
      multiplier: 1.0,
      target: "current-team"
    },
    {
      id: "half-current",
      title: "Meio valor",
      subtitle: "Time da vez recebe 50%",
      multiplier: 0.5,
      target: "current-team"
    },
    {
      id: "void",
      title: "Anular",
      subtitle: "Pergunta sem pontuação",
      multiplier: 0,
      target: "none"
    }
  ];

  useEffect(() => {
    if (mode === "quick") {
      setDistributions([]);
      setQuickModeSelected(false);
      setSelectedQuickOption(null);
    } else if (mode === "advanced") {
      setDistributions([]);
      setQuickModeSelected(false);
      setSelectedQuickOption(null);
    }
  }, [mode]);

  const isValid = isValidScoring(mode, quickModeSelected, distributions);

  const applyQuickOption = (option: QuickScoringOption) => {
    if (selectedQuickOption === option.id) {
      setSelectedQuickOption(null);
      setQuickModeSelected(false);
      setDistributions([]);
      return;
    }

    setSelectedQuickOption(option.id);
    setQuickModeSelected(true);

    const newDistributions = applyQuickScoringOption(
      option,
      basePoints,
      activeTeamId,
      activeParticipantId
    );

    const distributionsWithPercentage = newDistributions.map((dist) => ({
      ...dist,
      percentage: Math.round((dist.points / basePoints) * 100)
    }));

    setDistributions(distributionsWithPercentage);
  };

  const updateTeamDistribution = (teamId: string, points: number) => {
    const newDistributions = updateTeamDistributionUtil(
      distributions,
      teamId,
      points
    );
    const distributionsWithPercentage = newDistributions.map((dist) => ({
      ...dist,
      percentage: Math.round((dist.points / basePoints) * 100)
    }));
    setDistributions(distributionsWithPercentage);
  };

  const getTeamParticipants = (teamId: string) => {
    return getTeamParticipantsUtil(participants, teamId);
  };

  return {
    mode,
    setMode,
    distributions,
    setDistributions,
    selectedMultiplier,
    setSelectedMultiplier,
    quickModeSelected,
    selectedQuickOption,
    quickOptions,
    isValid,
    applyQuickOption,
    updateTeamDistribution,
    getTeamParticipants
  };
}
