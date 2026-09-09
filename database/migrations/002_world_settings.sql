CREATE TABLE IF NOT EXISTS world_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    schema_version INTEGER NOT NULL,
    currency TEXT NOT NULL,
    simulation_start_day INTEGER NOT NULL,
    simulation_start_hour INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS player_initial_inventory (
    product_id TEXT PRIMARY KEY,
    quantity INTEGER NOT NULL,

    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);
