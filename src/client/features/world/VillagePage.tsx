import {
  useEffect,
  useState,
} from "react";

import type {
  Village,
} from "../../../shared/types";

import {
  createVillage,
  deleteVillage,
  getWorld,
  updateVillage,
} from "./world-api";

import {
  VillageForm,
} from "./VillageForm";

import "./VillagePage.css";

export function VillagePage() {
  const [
    villages,
    setVillages,
  ] = useState<Village[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingVillage,
    setEditingVillage,
  ] = useState<Village | null>(
    null,
  );

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const world =
        await getWorld();

      setVillages(
        world.villages,
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load villages",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, []);

  function handleAdd() {
    setEditingVillage(null);
    setShowForm(true);
    setError("");
  }

  function handleEdit(
    village: Village,
  ) {
    setEditingVillage(village);
    setShowForm(true);
    setError("");
  }

  function handleCancel() {
    setEditingVillage(null);
    setShowForm(false);
    setError("");
  }

  async function handleSubmit(
    data: Omit<Village, "id">,
  ) {
    if (editingVillage) {
      await updateVillage(
        editingVillage.id,
        data,
      );
    } else {
      await createVillage(data);
    }

    setEditingVillage(null);
    setShowForm(false);

    await loadData();
  }

  async function handleDelete(
    village: Village,
  ) {
    const confirmed =
      window.confirm(
        `Delete village "${village.name}"? Referenced routes or markets may prevent deletion.`,
      );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await deleteVillage(
        village.id,
      );

      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete village",
      );
    }
  }

  if (loading) {
    return (
      <div className="village-page">
        <div className="village-panel">
          Loading villages...
        </div>
      </div>
    );
  }

  return (
    <div className="village-page">
      <div className="village-page-header">
        <div>
          <h1>
            Village Management
          </h1>

          <p>
            Manage villages and reset timers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdd}
        >
          + Add Village
        </button>
      </div>

      {error && (
        <div className="village-page-error">
          {error}
        </div>
      )}

      {showForm && (
        <section className="village-panel">
          <h2>
            {editingVillage
              ? "Edit Village"
              : "Add Village"}
          </h2>

          <VillageForm
            key={editingVillage?.id ?? "new"}
            village={editingVillage}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </section>
      )}

      <section className="village-panel">
        <div className="village-table-header">
          <h2>Villages</h2>

          <span>
            {villages.length} villages
          </span>
        </div>

        <div className="village-table-wrapper">
          <table className="village-table">
            <thead>
              <tr>
                <th>Village</th>
                <th>Reserve Money</th>
                <th>Current Reset</th>
                <th>After Reset</th>
                <th>Position</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {villages.map(
                (village) => (
                  <tr key={village.id}>
                    <td>
                      <strong>
                        {village.name}
                      </strong>

                      <small>
                        {village.id}
                      </small>
                    </td>

                    <td>
                      {
                        village.initialReserveMoney
                      }
                    </td>

                    <td>
                      {village.reset.current.days}
                      d{" "}
                      {village.reset.current.hours}
                      h
                    </td>

                    <td>
                      {
                        village.reset
                          .afterReset.days
                      }
                      d{" "}
                      {
                        village.reset
                          .afterReset.hours
                      }
                      h
                    </td>

                    <td>
                      {Math.round(
                        village.position.x,
                      )}
                      ,{" "}
                      {Math.round(
                        village.position.y,
                      )}
                    </td>

                    <td>
                      <div className="village-actions">
                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(
                              village,
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDelete(
                              village,
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}

              {villages.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="village-empty"
                  >
                    No villages found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
