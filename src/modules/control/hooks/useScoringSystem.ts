import { useState, useEffect } from "react";
import type { TriviaParticipant } from "@/modules/trivia/types";
import type {
  FlexibleScoringMode,
  PointDistribution,
  QuickScoringOption
} from "../types/control.types";
import {
  applyQuickScoringOption,
  calculatePercentage,
  updateTeamDistribution as updateTeamDistributionUtil,
  getTeamParticipants as getTeamParticipantsUtil,
  isValidScoring
} from "../utils/scoringUtils";
import type { FlexibleScoreValue } from "@/modules/game/domain/scoring";

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
  const [customFixedPoints, setCustomFixedPoints] = useState<number>(basePoints);
  const [quickModeSelected, setQuickModeSelected] = useState<boolean>(false);
  const [selectedQuickOption, setSelectedQuickOption] = useState<string | null>(
    null
  );
  const [selectedScoringValue, setSelectedScoringValue] =
    useState<FlexibleScoreValue | null>(null);

  const quickOptions: QuickScoringOption[] = [
    {
      id: "full-current",
      title: "Valor cheio",
      subtitle: "Time da vez recebe 100%",
      multiplier: 1.0,
      target: "current-team",
      scoringValue: {
        kind: "multiplier",
        multiplier: 1.0
      }
    },
    {
      id: "half-current",
      title: "Meio valor",
      subtitle: "Time da vez recebe 50% sugeridos",
      multiplier: 0.5,
      target: "current-team",
      scoringValue: {
        kind: "multiplier",
        multiplier: 0.5,
        suggested: true
      }
    },
    {
      id: "void",
      title: "Anular",
      subtitle: "Pergunta sem pontuação",
      multiplier: 0,
      target: "none",
      scoringValue: {
        kind: "void"
      }
    }
  ];

  useEffect(() => {
    setDistributions([]);
    setQuickModeSelected(false);
    setSelectedQuickOption(null);
    setSelectedScoringValue(null);
  }, [mode]);

  useEffect(() => {
    setCustomFixedPoints(basePoints);
  }, [basePoints]);

  const isValid = isValidScoring(mode, quickModeSelected, distributions);

  const normalizeDistributions = (nextDistributions: PointDistribution[]) => {
    return nextDistributions.map((dist) => ({
      ...dist,
      percentage:
        dist.percentage ?? calculatePercentage(dist.points, basePoints)
    }));
  };

  const applyScoringValue = (
    scoringValue: FlexibleScoreValue,
    targetTeamId = activeTeamId,
    targetParticipantId = activeParticipantId
  ) => {
    setSelectedScoringValue(scoringValue);

    if (!targetTeamId || scoringValue.kind === "void") {
      setDistributions([]);
      return;
    }

    const nextPoints =
      scoringValue.kind === "fixed"
        ? Math.round(scoringValue.points)
        : Math.round(basePoints * scoringValue.multiplier);

    const nextDistributions = updateTeamDistributionUtil(
      distributions,
      targetTeamId,
      nextPoints,
      {
        participantId: targetParticipantId || undefined,
        valueKind: scoringValue.kind,
        suggested: scoringValue.suggested,
        basePoints
      }
    );

    setDistributions(nextDistributions);
  };

  const applyQuickOption = (option: QuickScoringOption) => {
    if (selectedQuickOption === option.id) {
      setSelectedQuickOption(null);
      setQuickModeSelected(false);
      setSelectedScoringValue(null);
      setDistributions([]);
      return;
    }

    setSelectedQuickOption(option.id);
    setQuickModeSelected(true);
    setSelectedScoringValue(option.scoringValue ?? null);

    const newDistributions = normalizeDistributions(applyQuickScoringOption(
      option,
      basePoints,
      activeTeamId,
      activeParticipantId
    ));

    setDistributions(newDistributions);
  };

  const updateTeamDistribution = (
    teamId: string,
    points: number,
    participantId?: string
  ) => {
    const newDistributions = updateTeamDistributionUtil(
      distributions,
      teamId,
      points,
      {
        participantId,
        valueKind: "fixed",
        basePoints
      }
    );

    setSelectedScoringValue({
      kind: "fixed",
      points
    });
    setDistributions(newDistributions);
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
    customFixedPoints,
    setCustomFixedPoints,
    quickModeSelected,
    selectedQuickOption,
    selectedScoringValue,
    quickOptions,
    isValid,
    applyQuickOption,
    applyScoringValue,
    applyFixedPoints: (points: number, teamId?: string | null, participantId?: string | null) =>
      applyScoringValue(
        {
          kind: "fixed",
          points
        },
        teamId ?? activeTeamId,
        participantId ?? activeParticipantId
      ),
    applySuggestedHalfPoints: (
      teamId?: string | null,
      participantId?: string | null
    ) =>
      applyScoringValue(
        {
          kind: "multiplier",
          multiplier: 0.5,
          suggested: true
        },
        teamId ?? activeTeamId,
        participantId ?? activeParticipantId
      ),
    updateTeamDistribution,
    getTeamParticipants
  };
}
