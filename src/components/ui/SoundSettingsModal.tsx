import { Volume2, VolumeX, Play } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { useSoundSettings } from "../../hooks/useSoundSettings";
import { playSound, type SoundName } from "../../shared/services/audio.service";
import { useTranslation } from "@/shared/i18n";

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--color-text)]">{label}</span>
        {hint && <span className="block text-xs text-[var(--color-muted)]">{hint}</span>}
      </span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-muted)]/40"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

/**
 * Setor de configuração de sons (T9): liga/desliga global, volume e por momento
 * (cronômetro / feedback de resposta), com botões de teste. Os sons tocam na
 * mímica e nas perguntas — o cronômetro é compartilhado pelos dois.
 */
export function SoundSettingsModal({ isOpen, onClose }: SoundSettingsModalProps) {
  const { t } = useTranslation(['control', 'common']);
  const { settings, update } = useSoundSettings();

  const test = (name: SoundName) => {
    // Garante que o teste toque mesmo que a categoria esteja desligada:
    // habilita temporariamente o necessário só para o preview seria intrusivo;
    // em vez disso, o teste respeita as preferências atuais (se mudo, não toca).
    playSound(name);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('sound.title', { ns: 'control' })}>
      <div className="space-y-5 p-6">
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          {settings.enabled ? (
            <Volume2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
          ) : (
            <VolumeX className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-muted)]" />
          )}
          <p className="text-sm text-[var(--color-text)]">
            {t('sound.description', { ns: 'control' })}
          </p>
        </div>

        <Toggle
          checked={settings.enabled}
          onChange={(v) => update({ enabled: v })}
          label={t('sound.enabled', { ns: 'control' })}
          hint={t('sound.enabledHint', { ns: 'control' })}
        />

        {/* Volume */}
        <div className={settings.enabled ? "" : "pointer-events-none opacity-50"}>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">{t('sound.volume', { ns: 'control' })}</label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.volume * 100)}
            onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
            className="w-full accent-[var(--color-primary)]"
            aria-label={t('sound.volumeLabel', { ns: 'control' })}
          />
        </div>

        {/* Por momento */}
        <div className={`space-y-2 ${settings.enabled ? "" : "pointer-events-none opacity-50"}`}>
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">{t('sound.moments', { ns: 'control' })}</h4>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Toggle
                checked={settings.timer}
                onChange={(v) => update({ timer: v })}
                label={t('sound.timer', { ns: 'control' })}
                hint={t('sound.timerHint', { ns: 'control' })}
              />
            </div>
            <Button variant="outline" size="icon" aria-label={t('sound.testTimer', { ns: 'control' })} onClick={() => test("timeUp")}>
              <Play size={16} />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Toggle
                checked={settings.feedback}
                onChange={(v) => update({ feedback: v })}
                label={t('sound.feedback', { ns: 'control' })}
                hint={t('sound.feedbackHint', { ns: 'control' })}
              />
            </div>
            <Button variant="outline" size="icon" aria-label={t('sound.testCorrect', { ns: 'control' })} onClick={() => test("correct")}>
              <Play size={16} />
            </Button>
          </div>
        </div>

        <div className="flex justify-end border-t border-[var(--color-border)] pt-4">
          <Button variant="outline" onClick={onClose}>
            {t('actions.close', { ns: 'common' })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
