import { useEffect } from "react";

import { WorldCanvas } from "./WorldCanvas";
import { useWorldStore } from "./world-store";

export function WorldPage() {
  const world = useWorldStore(
    (state) => state.world,
  );

  const loading = useWorldStore(
    (state) => state.loading,
  );

  const error = useWorldStore(
    (state) => state.error,
  );

  const hasUnsavedChanges =
    useWorldStore(
      (state) =>
        state.hasUnsavedChanges,
    );

  const canUndo = useWorldStore(
    (state) =>
      state.undoStack.length > 0,
  );

  const canRedo = useWorldStore(
    (state) =>
      state.redoStack.length > 0,
  );

  const loadWorld = useWorldStore(
    (state) => state.loadWorld,
  );

  const undo = useWorldStore(
    (state) => state.undo,
  );

  const redo = useWorldStore(
    (state) => state.redo,
  );

  const saveChanges =
    useWorldStore(
      (state) => state.saveChanges,
    );

  const cancelChanges =
    useWorldStore(
      (state) => state.cancelChanges,
    );

  useEffect(() => {
    void loadWorld();
  }, [loadWorld]);

  if (loading && !world) {
    return <div className="page-state">Loading world...</div>;
  }

  if (error && !world) {
    return (
      <div className="page-alert">
        Failed to load world: {error}
        <div><button type="button" onClick={() => void loadWorld()}>Try again</button></div>
      </div>
    );
  }

  if (!world) {
    return <div className="page-state">No world data is configured.</div>;
  }

  return (
    <div>
      <h1>World</h1>

      <p>
        Currency:{" "}
        <strong>
          {world.settings.currency}
        </strong>
      </p>

      <p>
        Villages:{" "}
        <strong>
          {world.villages.length}
        </strong>
      </p>

      <p>
        Products:{" "}
        <strong>
          {world.products.length}
        </strong>
      </p>

      <p>
        Routes:{" "}
        <strong>
          {world.routes.length}
        </strong>
      </p>

      <p>
        Markets:{" "}
        <strong>
          {world.markets.length}
        </strong>
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <button
          onClick={undo}
          disabled={!canUndo || loading}
        >
          Undo
        </button>

        <button
          onClick={redo}
          disabled={!canRedo || loading}
        >
          Redo
        </button>

        <button
          onClick={() =>
            void saveChanges()
          }
          disabled={
            !hasUnsavedChanges ||
            loading
          }
        >
          Save
        </button>

        <button
          onClick={cancelChanges}
          disabled={
            !hasUnsavedChanges ||
            loading
          }
        >
          Cancel
        </button>

        {hasUnsavedChanges && (
          <span>
            Unsaved changes
          </span>
        )}
      </div>

      {error && <div className="page-alert" role="alert">World update failed: {error}</div>}

      <WorldCanvas world={world} />
    </div>
  );
}
