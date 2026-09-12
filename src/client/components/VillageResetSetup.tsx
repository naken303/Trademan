import { useState } from "react";
import type { Village } from "../../shared/types";
import { formatDuration } from "../utils/format";
import {
  parseVillageResetDraft,
  type VillageResetDraft,
  type VillageResetDraftValue,
} from "./village-reset-setup-model";
import "./VillageResetSetup.css";

function villageImageUrl(village: Village): string | null {
  const image = village.visual?.image?.trim();
  return image ? `/${image.replaceAll("\\", "/").replace(/^\/+/, "")}` : null;
}

function VillageVisual({ village }: { village: Village }) {
  const image = villageImageUrl(village);
  const [failedImage, setFailedImage] = useState<string | null>(null);

  if (image && failedImage !== image) {
    return <img src={image} alt="" onError={() => setFailedImage(image)} />;
  }

  return <div className="village-reset-fallback" aria-hidden="true">🏘️</div>;
}

interface VillageResetSetupProps {
  villages: Village[];
  values: VillageResetDraft;
  onChange: (values: VillageResetDraft) => void;
  disabled?: boolean;
  showAllErrors?: boolean;
}

export function VillageResetSetup({ villages, values, onChange, disabled = false, showAllErrors = false }: VillageResetSetupProps) {
  const [touched, setTouched] = useState<Record<string, { days?: boolean; hours?: boolean }>>({});
  const { errors } = parseVillageResetDraft(villages, values);

  function update(villageId: string, field: keyof VillageResetDraftValue, value: string) {
    setTouched((current) => ({ ...current, [villageId]: { ...current[villageId], [field]: true } }));
    onChange({ ...values, [villageId]: { ...(values[villageId] ?? { days: "", hours: "" }), [field]: value } });
  }

  return <section className="village-reset-setup" aria-labelledby="village-reset-heading">
    <div className="village-reset-heading">
      <div><h3 id="village-reset-heading">Current Reset</h3><p>Set the remaining reset time for each village at the start of this run.</p></div>
    </div>
    <div className="village-reset-grid">
      {villages.map((village) => {
        const value = values[village.id] ?? { days: "", hours: "" };
        const villageErrors = errors[village.id];
        const showDaysError = showAllErrors || touched[village.id]?.days;
        const showHoursError = showAllErrors || touched[village.id]?.hours;
        const showDurationError = showAllErrors || (touched[village.id]?.days && touched[village.id]?.hours);
        const hasVisibleError = Boolean(
          (showDaysError && villageErrors?.days) ||
          (showHoursError && villageErrors?.hours) ||
          (showDurationError && villageErrors?.duration),
        );

        return <article className={`village-reset-card${hasVisibleError ? " has-error" : ""}`} key={village.id} data-testid={`village-reset-card-${village.id}`}>
          <div className="village-reset-visual"><VillageVisual village={village} /></div>
          <div className="village-reset-identity"><h4>{village.name}</h4><small>Cycle: {formatDuration(village.reset.afterReset.days, village.reset.afterReset.hours)}</small></div>
          <div className="village-reset-inputs">
            <strong>Current Reset</strong>
            <div className="village-reset-fields">
              <label>Days<input aria-label={`${village.name} Current Reset Days`} type="number" min="0" step="1" inputMode="numeric" disabled={disabled} value={value.days} aria-invalid={showDaysError && Boolean(villageErrors?.days)} onChange={(event) => update(village.id, "days", event.target.value)} /></label>
              <label>Hours<input aria-label={`${village.name} Current Reset Hours`} type="number" min="0" max="23" step="1" inputMode="numeric" disabled={disabled} value={value.hours} aria-invalid={showHoursError && Boolean(villageErrors?.hours)} onChange={(event) => update(village.id, "hours", event.target.value)} /></label>
            </div>
            {showDaysError && villageErrors?.days && <small className="village-reset-error">{villageErrors.days}</small>}
            {showHoursError && villageErrors?.hours && <small className="village-reset-error">{villageErrors.hours}</small>}
            {showDurationError && villageErrors?.duration && <small className="village-reset-error">{villageErrors.duration}</small>}
          </div>
        </article>;
      })}
    </div>
  </section>;
}
