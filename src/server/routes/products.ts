import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";

import { productSchema } from "../../shared/schemas";
import {
  createProductWithGeneratedId,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
} from "../database/repositories/product-repository";

const productsDirectory = path.resolve(
  process.cwd(),
  "assets",
  "products",
);

fs.mkdirSync(productsDirectory, {
  recursive: true,
});

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, productsDirectory);
    },

    filename: (req, file, callback) => {
      const productId = getProductId(req.params.id);

      const extension = path
        .extname(file.originalname)
        .toLowerCase();

      callback(
        null,
        `${productId}${extension}`,
      );
    },
  }),

  fileFilter: (_req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(
        new Error(
          "Only JPG, PNG, WEBP, and GIF images are allowed.",
        ),
      );

      return;
    }

    callback(null, true);
  },

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

function getProductId(
  parameter: string | string[],
): string {
  if (Array.isArray(parameter)) {
    return parameter[0] ?? "";
  }

  return parameter;
}

function getErrorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : "Unknown error";
}

export const productsRouter = Router();

productsRouter.get("/", (_req, res) => {
  try {
    res.json(getAllProducts());
  } catch (error) {
    console.error(
      "Failed to load products:",
      error,
    );

    res.status(500).json({
      error: "Failed to load products",
    });
  }
});

productsRouter.get("/:id", (req, res) => {
  try {
    const productId = getProductId(
      req.params.id,
    );

    const product = getProductById(productId);

    if (!product) {
      res.status(404).json({
        error: "Product not found",
      });

      return;
    }

    res.json(product);
  } catch (error) {
    console.error(
      "Failed to load product:",
      error,
    );

    res.status(500).json({
      error: "Failed to load product",
    });
  }
});

productsRouter.post("/", (req, res) => {
  try {
    const product = createProductWithGeneratedId(
      productSchema.omit({ id: true }).parse(req.body),
    );

    res.status(201).json(product);
  } catch (error) {
    console.error(
      "Failed to create product:",
      error,
    );

    res.status(400).json({
      error: getErrorMessage(error),
    });
  }
});

productsRouter.put("/:id", (req, res) => {
  try {
    const productId = getProductId(
      req.params.id,
    );

    const product = productSchema.parse({
      ...req.body,
      id: productId,
    });

    updateProduct(product);

    res.json(product);
  } catch (error) {
    console.error(
      "Failed to update product:",
      error,
    );

    const message = getErrorMessage(error);

    if (message.startsWith("Product not found:")) {
      res.status(404).json({
        error: message,
      });

      return;
    }

    res.status(400).json({
      error: message,
    });
  }
});

productsRouter.post(
  "/:id/image",
  upload.single("image"),
  (req, res) => {
    try {
      const productId = getProductId(
        req.params.id,
      );

      const product = getProductById(productId);

      if (!product) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }

        res.status(404).json({
          error: "Product not found",
        });

        return;
      }

      if (!req.file) {
        res.status(400).json({
          error: "Image file is required",
        });

        return;
      }

      const extension = path
        .extname(req.file.originalname)
        .toLowerCase();

      const relativePath = path
        .join(
          "assets",
          "products",
          `${productId}${extension}`,
        )
        .replaceAll("\\", "/");

      const oldImagePath = product.image?.path;

      updateProduct({
        ...product,
        image: {
          type: "file",
          path: relativePath,
        },
      });

      if (
        oldImagePath &&
        oldImagePath !== relativePath
      ) {
        const oldAbsolutePath = path.resolve(
          process.cwd(),
          oldImagePath,
        );

        if (fs.existsSync(oldAbsolutePath)) {
          fs.unlinkSync(oldAbsolutePath);
        }
      }

      res.json({
        ...product,
        image: {
          type: "file",
          path: relativePath,
        },
      });
    } catch (error) {
      console.error(
        "Failed to upload product image:",
        error,
      );

      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // Ignore cleanup errors.
        }
      }

      res.status(400).json({
        error:
          getErrorMessage(error) ||
          "Failed to upload product image",
      });
    }
  },
);

productsRouter.delete(
  "/:id/image",
  (req, res) => {
    try {
      const productId = getProductId(
        req.params.id,
      );

      const product = getProductById(productId);

      if (!product) {
        res.status(404).json({
          error: "Product not found",
        });

        return;
      }

      if (product.image?.path) {
        const absolutePath = path.resolve(
          process.cwd(),
          product.image.path,
        );

        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      }

      updateProduct({
        ...product,
        image: undefined,
      });

      res.status(204).send();
    } catch (error) {
      console.error(
        "Failed to delete product image:",
        error,
      );

      res.status(500).json({
        error:
          getErrorMessage(error) ||
          "Failed to delete product image",
      });
    }
  },
);

productsRouter.delete("/:id", (req, res) => {
  try {
    const productId = getProductId(
      req.params.id,
    );

    deleteProduct(productId);

    res.status(204).send();
  } catch (error) {
    console.error(
      "Failed to delete product:",
      error,
    );

    const message = getErrorMessage(error);

    if (message.startsWith("Product not found:")) {
      res.status(404).json({
        error: message,
      });

      return;
    }

    res.status(500).json({
      error: "Failed to delete product",
    });
  }
});
