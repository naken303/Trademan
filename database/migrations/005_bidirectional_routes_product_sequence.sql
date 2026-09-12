ALTER TABLE routes ADD COLUMN reverse_travel_days INTEGER;
ALTER TABLE routes ADD COLUMN reverse_travel_hours INTEGER;

UPDATE routes AS forward
SET reverse_travel_days = (SELECT reverse.travel_days FROM routes AS reverse WHERE reverse.from_village_id = forward.to_village_id AND reverse.to_village_id = forward.from_village_id),
    reverse_travel_hours = (SELECT reverse.travel_hours FROM routes AS reverse WHERE reverse.from_village_id = forward.to_village_id AND reverse.to_village_id = forward.from_village_id)
WHERE forward.from_village_id < forward.to_village_id
  AND EXISTS (SELECT 1 FROM routes AS reverse WHERE reverse.from_village_id = forward.to_village_id AND reverse.to_village_id = forward.from_village_id);

DELETE FROM routes
WHERE from_village_id > to_village_id
  AND EXISTS (SELECT 1 FROM routes AS forward WHERE forward.from_village_id = routes.to_village_id AND forward.to_village_id = routes.from_village_id);

UPDATE routes SET reverse_travel_days = NULL, reverse_travel_hours = NULL
WHERE reverse_travel_days = travel_days AND reverse_travel_hours = travel_hours;

CREATE UNIQUE INDEX routes_unordered_pair_unique ON routes (
  CASE WHEN from_village_id < to_village_id THEN from_village_id ELSE to_village_id END,
  CASE WHEN from_village_id < to_village_id THEN to_village_id ELSE from_village_id END
);

CREATE TABLE product_id_sequence (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_value INTEGER NOT NULL CHECK (next_value > 0)
);
INSERT INTO product_id_sequence (id, next_value) VALUES (1, 1);
UPDATE product_id_sequence
SET next_value = MAX(
  next_value,
  COALESCE((
    SELECT MAX(CAST(SUBSTR(id, 2) AS INTEGER)) + 1
    FROM products
    WHERE LENGTH(id) = 7
      AND id GLOB 'P[0-9][0-9][0-9][0-9][0-9][0-9]'
  ), 1)
)
WHERE id = 1;
