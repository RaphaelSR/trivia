import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { Palette, Lock, Users, Check, CheckCircle, Plus, Trash2, X, Info } from "lucide-react";
import { useThemeMode } from "../../app/providers/useThemeMode";
import type { OnboardingConfig } from "@/modules/control/types/control.types";
import type { ThemeMode } from "@/shared/types/game";
import { useTranslation } from "@/shared/i18n";
import { ThemePicker } from "@/shared/components/ThemePicker";
import { getThemeOption } from "@/shared/constants/theme";

interface OfflineOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: OnboardingConfig) => void;
  onSkip?: () => void;
}

const teamColors = [
  "#4f46e5", "#22d3ee", "#f97316", "#ef4444", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"
];

const createInitialConfig = (theme: ThemeMode, defaultTitle: string): OnboardingConfig => ({
  theme,
  pin: "",
  sessionTitle: defaultTitle,
  sessionDate: new Date().toISOString().split('T')[0],
  customFilms: [],
  teams: [],
});

export function OfflineOnboardingModal({
  isOpen,
  onClose,
  onComplete,
  onSkip,
}: OfflineOnboardingModalProps) {
  const { t, i18n } = useTranslation(['game', 'common']);
  const { theme, setTheme } = useThemeMode();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const defaultSessionTitle = t('onboarding.defaultSessionTitle', {
    ns: 'game',
    date: new Date().toLocaleDateString(locale),
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<OnboardingConfig>(() => createInitialConfig(theme, defaultSessionTitle));
  const handleThemeSelect = (themeId: ThemeMode) => {
    setConfig((prev) => ({ ...prev, theme: themeId }));
    setTheme(themeId);
  };

  const handlePinChange = (pin: string) => {
    setConfig((prev) => ({ ...prev, pin }));
  };

  const handleTitleChange = (title: string) => {
    setConfig((prev) => ({ ...prev, sessionTitle: title }));
  };

  const handleDateChange = (date: string) => {
    setConfig((prev) => ({ ...prev, sessionDate: date }));
  };

  const handleTeamAdd = () => {
    const newTeam = {
      name: t('onboarding.defaultTeamName', { ns: 'game', number: config.teams.length + 1 }),
      color: teamColors[config.teams.length % teamColors.length],
      members: []
    };
    setConfig((prev) => ({ ...prev, teams: [...prev.teams, newTeam] }));
  };

  const handleTeamUpdate = (index: number, updates: Partial<typeof config.teams[0]>) => {
    setConfig((prev) => ({
      ...prev,
      teams: prev.teams.map((team, i) => i === index ? { ...team, ...updates } : team)
    }));
  };

  const handleTeamRemove = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      teams: prev.teams.filter((_, i) => i !== index)
    }));
  };

  const handleMemberAdd = (teamIndex: number, memberName: string) => {
    if (memberName.trim()) {
      setConfig((prev) => ({
        ...prev,
        teams: prev.teams.map((team, i) => 
          i === teamIndex 
            ? { ...team, members: [...team.members, memberName.trim()] }
            : team
        )
      }));
    }
  };

  const handleMemberRemove = (teamIndex: number, memberIndex: number) => {
    setConfig((prev) => ({
      ...prev,
      teams: prev.teams.map((team, i) => 
        i === teamIndex 
          ? { ...team, members: team.members.filter((_, j) => j !== memberIndex) }
          : team
      )
    }));
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(config);
      resetState();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetState = () => {
    setCurrentStep(1);
    setConfig(createInitialConfig(theme, defaultSessionTitle));
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return config.pin.length === 0 || config.pin.length >= 4;
      case 3:
        return config.sessionTitle.trim().length > 0;
      case 4:
        return config.teams.length >= 2 && config.teams.every(team => team.members.length > 0);
      case 5:
        return true; // Resumo final
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Palette className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-text)]">
          {t('onboarding.themes.title', { ns: 'game' })}
        </h3>
        <p className="text-[var(--color-muted)]">
          {t('onboarding.themes.description', { ns: 'game' })}
        </p>
      </div>

      <div className="max-h-[min(56dvh,520px)] overflow-y-auto pr-1">
        <ThemePicker value={config.theme} onChange={handleThemeSelect} className="lg:grid-cols-2" />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-text)]">
          {t('onboarding.pin.title', { ns: 'game' })}
        </h3>
        <p className="text-[var(--color-muted)]">
          {t('onboarding.pin.description', { ns: 'game' })}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            {t('onboarding.pin.label', { ns: 'game' })}
          </label>
          <input
            type="password"
            value={config.pin}
            onChange={(e) => handlePinChange(e.target.value)}
            placeholder={t('onboarding.pin.placeholder', { ns: 'game' })}
            className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            maxLength={20}
          />
          <p className="text-xs text-[var(--color-muted)] mt-1">
            {t('onboarding.pin.hint', { ns: 'game' })}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-[var(--color-primary)] mt-0.5" />
            <div>
              <h4 className="font-semibold text-[var(--color-text)] text-sm">
                {t('onboarding.pin.whenTitle', { ns: 'game' })}
              </h4>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                {t('onboarding.pin.whenDescription', { ns: 'game' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Users className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-text)]">
          {t('onboarding.session.title', { ns: 'game' })}
        </h3>
        <p className="text-[var(--color-muted)]">
          {t('onboarding.session.description', { ns: 'game' })}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            {t('onboarding.session.name', { ns: 'game' })}
          </label>
          <input
            type="text"
            value={config.sessionTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={t('onboarding.session.namePlaceholder', { ns: 'game' })}
            className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            {t('onboarding.session.date', { ns: 'game' })}
          </label>
          <input
            type="date"
            value={config.sessionDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Users className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-text)]">
          {t('onboarding.teams.title', { ns: 'game' })}
        </h3>
        <p className="text-[var(--color-muted)]">
          {t('onboarding.teams.description', { ns: 'game' })}
        </p>
      </div>

      <div className="space-y-4">
        {config.teams.map((team, index) => (
          <div key={index} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: team.color }}
              />
              <input
                type="text"
                value={team.name}
                onChange={(e) => handleTeamUpdate(index, { name: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder={t('onboarding.teams.teamName', { ns: 'game' })}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTeamRemove(index)}
                aria-label={t('onboarding.teams.removeTeam', { ns: 'game', number: index + 1 })}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('onboarding.teams.memberName', { ns: 'game' })}
                  className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleMemberAdd(index, e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    handleMemberAdd(index, input.value);
                    input.value = '';
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {team.members.map((member, memberIndex) => (
                  <span
                    key={memberIndex}
                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm"
                  >
                    {member}
                    <button
                      onClick={() => handleMemberRemove(index, memberIndex)}
                      aria-label={t('onboarding.teams.removeMember', { ns: 'game', name: member })}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={handleTeamAdd}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('onboarding.teams.addTeam', { ns: 'game' })}
        </Button>

      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-text)]">
          {t('onboarding.summary.title', { ns: 'game' })}
        </h3>
        <p className="text-[var(--color-muted)]">
          {t('onboarding.summary.description', { ns: 'game' })}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-[var(--color-text)] text-sm mb-1">
              {t('onboarding.summary.reminderTitle', { ns: 'game' })}
            </h4>
            <p className="text-xs text-[var(--color-muted)]">
              {t('onboarding.summary.reminderDescription', { ns: 'game' })}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-[var(--color-secondary)]/5 border border-[var(--color-secondary)]/20">
          <h4 className="font-semibold text-[var(--color-text)] text-sm mb-3">{t('onboarding.summary.general', { ns: 'game' })}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">{t('onboarding.summary.theme', { ns: 'game' })}</span>
              <span className="text-[var(--color-text)]">
                {t(`onboarding.themes.${getThemeOption(config.theme).translationKey}.name`, { ns: 'game' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">{t('onboarding.summary.pin', { ns: 'game' })}</span>
              <span className="text-[var(--color-text)]">
                {config.pin ? "•".repeat(config.pin.length) : t('onboarding.summary.pinNotConfigured', { ns: 'game' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">{t('onboarding.summary.game', { ns: 'game' })}</span>
              <span className="text-[var(--color-text)]">{config.sessionTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">{t('onboarding.summary.date', { ns: 'game' })}</span>
              <span className="text-[var(--color-text)]">
                {new Date(config.sessionDate).toLocaleDateString(locale)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
          <h4 className="font-semibold text-[var(--color-text)] text-sm mb-1">{t('onboarding.summary.contentTitle', { ns: 'game' })}</h4>
          <p className="text-xs text-[var(--color-muted)]">
            {t('onboarding.summary.contentDescription', { ns: 'game' })}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-secondary)]/5 border border-[var(--color-secondary)]/20">
          <h4 className="font-semibold text-[var(--color-text)] text-sm mb-3">
            {t('onboarding.teams.configured', { ns: 'game', count: config.teams.length })}
          </h4>
          <div className="space-y-2">
            {config.teams.map((team, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <span className="text-sm text-[var(--color-text)]">
                  {team.name} ({t('onboarding.teams.memberCount', { ns: 'game', count: team.members.length })})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep5();
      case 5:
        return renderStep6();
      default:
        return renderStep1();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('onboarding.title', { ns: 'game' })}>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-[var(--color-text)]">
              {t('onboarding.title', { ns: 'game' })}
            </h2>
            <span className="text-sm text-[var(--color-muted)]">
              {t('onboarding.step', { ns: 'game', current: currentStep, total: 5 })}
            </span>
          </div>
          <div className="w-full bg-[var(--color-border)] rounded-full h-2">
            <div
              className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>

        {currentStep === 1 && (
          <div className="mb-6 p-4 rounded-2xl bg-[var(--color-secondary)]/10 border border-[var(--color-secondary)]/20">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-[var(--color-secondary)] mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-[var(--color-text)] text-sm mb-1">
                  {t('onboarding.introTitle', { ns: 'game' })}
                </h4>
                <p className="text-xs text-[var(--color-muted)]">
                  {t('onboarding.introDescription', { ns: 'game' })}
                </p>
              </div>
            </div>
          </div>
        )}

        {renderCurrentStep()}

        <div className="flex justify-between mt-8">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? handleClose : handleBack}
            >
              {currentStep === 1 ? t('actions.cancel', { ns: 'common' }) : t('actions.back', { ns: 'common' })}
            </Button>
            {onSkip && currentStep === 1 && (
              <Button
                variant="ghost"
                onClick={onSkip}
                className="text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                {t('onboarding.skip', { ns: 'game' })}
              </Button>
            )}
          </div>
          <Button
            onClick={handleNext}
            disabled={!isStepValid()}
          >
            {currentStep === 5 ? t('onboarding.finish', { ns: 'game' }) : t('actions.continue', { ns: 'common' })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
