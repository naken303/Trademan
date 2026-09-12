import {
  Router,
} from "express";

import {
  randomUUID,
} from "node:crypto";

import {
  villageSchema,
  worldDataSchema,
} from "../../shared/schemas";

import {
  getWorld,
} from "../database/repositories/world-repository";

import {
  createWorldBackup,
  importWorld,
  serializeWorld,
} from "../database";

import {
  createVillage,
  deleteVillage,
  getAllVillages,
  getVillageById,
  updateVillage,
  updateVillagePosition,
} from "../database/repositories/village-repository";

const worldRouter = Router();

function getId(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

worldRouter.get("/", (_req, res) => {
  try {
    const world = getWorld();

    res.json(world);
  } catch (error) {
    console.error(
      "Failed to load world:",
      error,
    );

    res.status(500).json({
      error: "Failed to load world",
    });
  }
});

worldRouter.get("/export", (_req, res) => {
  try {
    res
      .type("application/json")
      .attachment("village-trade-world.json")
      .send(serializeWorld(getWorld()));
  } catch (error) {
    console.error("Failed to export world:", error);
    res.status(500).json({ error: "Failed to export world" });
  }
});

function replaceWorld(input: unknown) {
  const parsed = worldDataSchema.safeParse(input);
  if (!parsed.success) return parsed;
  importWorld(parsed.data);
  return parsed;
}

worldRouter.post("/import", (req, res) => {
  try {
    const parsed = replaceWorld(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }
    res.json(getWorld());
  } catch (error) {
    console.error("Failed to import world:", error);
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to import world" });
  }
});

worldRouter.put("/", (req, res) => {
  try {
    const parsed = replaceWorld(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }
    res.json(getWorld());
  } catch (error) {
    console.error("Failed to save world settings:", error);
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to save world settings" });
  }
});

worldRouter.post("/backup", (_req, res) => {
  try {
    const filename = createWorldBackup(getWorld());
    res.status(201).json({ filename });
  } catch (error) {
    console.error("Failed to create backup:", error);
    res.status(500).json({ error: "Failed to create backup" });
  }
});

worldRouter.get(
  "/villages",
  (_req, res) => {
    try {
      res.json(getAllVillages());
    } catch (error) {
      console.error(
        "Failed to load villages:",
        error,
      );

      res.status(500).json({
        error: "Failed to load villages",
      });
    }
  },
);

worldRouter.get(
  "/villages/:id",
  (req, res) => {
    try {
      const villageId = getId(
        req.params.id,
      );

      if (!villageId) {
        res.status(400).json({
          error: "Village id is required",
        });
        return;
      }

      const village =
        getVillageById(villageId);

      if (!village) {
        res.status(404).json({
          error: "Village not found",
        });
        return;
      }

      res.json(village);
    } catch (error) {
      console.error(
        "Failed to load village:",
        error,
      );

      res.status(500).json({
        error: "Failed to load village",
      });
    }
  },
);

worldRouter.post(
  "/villages",
  (req, res) => {
    try {
      const bodySchema =
        villageSchema.omit({
          id: true,
        });

      const parsed =
        bodySchema.safeParse(
          req.body,
        );

      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues,
        });
        return;
      }

      const village = {
        id: randomUUID(),
        ...parsed.data,
      };

      createVillage(village);

      res.status(201).json(village);
    } catch (error) {
      console.error(
        "Failed to create village:",
        error,
      );

      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to create village",
      });
    }
  },
);

worldRouter.put(
  "/villages/:id",
  (req, res) => {
    try {
      const villageId = getId(
        req.params.id,
      );

      if (!villageId) {
        res.status(400).json({
          error: "Village id is required",
        });
        return;
      }

      const parsed =
        villageSchema
          .omit({
            id: true,
          })
          .safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues,
        });
        return;
      }

      const existingVillage =
        getVillageById(
          villageId,
        );

      if (!existingVillage) {
        res.status(404).json({
          error: "Village not found",
        });
        return;
      }

      const village = {
        id: villageId,
        ...parsed.data,
      };

      updateVillage(village);

      res.json(village);
    } catch (error) {
      console.error(
        "Failed to update village:",
        error,
      );

      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to update village",
      });
    }
  },
);

worldRouter.delete(
  "/villages/:id",
  (req, res) => {
    try {
      const villageId = getId(
        req.params.id,
      );

      if (!villageId) {
        res.status(400).json({
          error: "Village id is required",
        });
        return;
      }

      const village =
        getVillageById(
          villageId,
        );

      if (!village) {
        res.status(404).json({
          error: "Village not found",
        });
        return;
      }

      deleteVillage(villageId);

      res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "Failed to delete village:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to delete village";

      if (message.includes("FOREIGN KEY constraint failed")) {
        res.status(409).json({
          error:
            "This village is the player's current village. Choose another current village in Database & Settings before deleting it.",
        });
        return;
      }

      res.status(500).json({
        error: "Failed to delete village",
      });
    }
  },
);

worldRouter.put(
  "/villages/:id/position",
  (req, res) => {
    try {
      const villageId = getId(
        req.params.id,
      );

      if (!villageId) {
        res.status(400).json({
          error: "Village id is required",
        });
        return;
      }

      const x = Number(req.body?.x);
      const y = Number(req.body?.y);

      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
        res.status(400).json({
          error:
            "Position x and y must be finite numbers",
        });
        return;
      }

      updateVillagePosition(
        villageId,
        {
          x,
          y,
        },
      );

      const village =
        getVillageById(villageId);

      res.json(village);
    } catch (error) {
      console.error(
        "Failed to update village position:",
        error,
      );

      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to update village position",
      });
    }
  },
);

export {
  worldRouter,
};
