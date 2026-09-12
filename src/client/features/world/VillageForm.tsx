import {
  useState,
} from "react";

import type {
  Village,
} from "../../../shared/types";

interface VillageFormProps {
  village?: Village | null;
  onSubmit: (
    village: Omit<Village, "id">,
  ) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  name: string;
  initialReserveMoney: string;

  afterResetDays: string;
  afterResetHours: string;
}

function createInitialForm(
  village?: Village | null,
): FormState {
  return {
    name: village?.name ?? "",

    initialReserveMoney:
      village !== null &&
      village !== undefined
        ? String(
            village.initialReserveMoney,
          )
        : "",

    afterResetDays:
      village !== null &&
      village !== undefined
        ? String(
            village.reset.afterReset.days,
          )
        : "0",

    afterResetHours:
      village !== null &&
      village !== undefined
        ? String(
            village.reset.afterReset.hours,
          )
        : "0",
  };
}

export function VillageForm({
  village,
  onSubmit,
  onCancel,
}: VillageFormProps) {
  const [
    form,
    setForm,
  ] = useState<FormState>(
    createInitialForm(village),
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  function updateField(
    field: keyof FormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    const initialReserveMoney =
      Number(
        form.initialReserveMoney,
      );

    const afterResetDays =
      Number(form.afterResetDays);

    const afterResetHours =
      Number(form.afterResetHours);

    if (!form.name.trim()) {
      setError(
        "Village name is required.",
      );
      return;
    }

    if (
      !Number.isFinite(
        initialReserveMoney,
      ) ||
      initialReserveMoney < 0
    ) {
      setError(
        "Initial reserve money must be zero or greater.",
      );
      return;
    }

    if (
      !Number.isInteger(
        afterResetDays,
      ) ||
      afterResetDays < 0
    ) {
      setError(
        "After-reset days must be a whole number of zero or greater.",
      );
      return;
    }

    if (
      !Number.isInteger(
        afterResetHours,
      ) ||
      afterResetHours < 0 ||
      afterResetHours > 23
    ) {
      setError(
        "After-reset hours must be between 0 and 23.",
      );
      return;
    }

    if (
      afterResetDays === 0 &&
      afterResetHours === 0
    ) {
      setError(
        "After-reset duration must be greater than zero.",
      );
      return;
    }

    setSaving(true);

    try {
      await onSubmit({
        name: form.name.trim(),

        position:
          village?.position ?? {
            x: 100,
            y: 100,
          },

        visual:
          village?.visual ?? {
            icon: null,
            image: null,
          },

        initialReserveMoney,

        reset: {
          afterReset: {
            days: afterResetDays,
            hours: afterResetHours,
          },
        },
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save village",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="village-form"
      onSubmit={handleSubmit}
    >
      <div className="village-form-field">
        <label htmlFor="village-name">
          Village Name
        </label>

        <input
          id="village-name"
          type="text"
          value={form.name}
          onChange={(event) =>
            updateField(
              "name",
              event.target.value,
            )
          }
          placeholder="For example, Village A"
        />
      </div>

      <div className="village-form-field">
        <label htmlFor="village-reserve">
          Initial Reserve Money
        </label>

        <input
          id="village-reserve"
          type="number"
          min="0"
          step="0.01"
          value={
            form.initialReserveMoney
          }
          onChange={(event) =>
            updateField(
              "initialReserveMoney",
              event.target.value,
            )
          }
        />
      </div>

      <fieldset>
        <legend>
          After Reset
        </legend>

        <div className="village-duration-fields">
          <div className="village-form-field">
            <label htmlFor="village-after-days">
              Days
            </label>

            <input
              id="village-after-days"
              type="number"
              min="0"
              step="1"
              value={
                form.afterResetDays
              }
              onChange={(event) =>
                updateField(
                  "afterResetDays",
                  event.target.value,
                )
              }
            />
          </div>

          <div className="village-form-field">
            <label htmlFor="village-after-hours">
              Hours
            </label>

            <input
              id="village-after-hours"
              type="number"
              min="0"
              max="23"
              step="1"
              value={
                form.afterResetHours
              }
              onChange={(event) =>
                updateField(
                  "afterResetHours",
                  event.target.value,
                )
              }
            />
          </div>
        </div>
      </fieldset>

      {error && (
        <div className="village-form-error">
          {error}
        </div>
      )}

      <div className="village-form-actions">
        <button
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : village
              ? "Save changes"
              : "Add Village"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
