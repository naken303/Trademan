CREATE TABLE IF NOT EXISTS villages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    visual_icon TEXT,
    visual_image TEXT,
    initial_reserve_money REAL NOT NULL,
    reset_current_days INTEGER NOT NULL,
    reset_current_hours INTEGER NOT NULL,
    reset_after_days INTEGER NOT NULL,
    reset_after_hours INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    image_type TEXT,
    image_path TEXT,
    units_per_crate INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    from_village_id TEXT NOT NULL,
    to_village_id TEXT NOT NULL,
    travel_days INTEGER NOT NULL,
    travel_hours INTEGER NOT NULL,

    FOREIGN KEY (
        from_village_id
    )
    REFERENCES villages(id)
    ON DELETE CASCADE,

    FOREIGN KEY (
        to_village_id
    )
    REFERENCES villages(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS markets (
    id TEXT PRIMARY KEY,
    village_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    side TEXT NOT NULL,
    unit_price REAL NOT NULL,
    initial_quantity INTEGER NOT NULL,

    FOREIGN KEY (
        village_id
    )
    REFERENCES villages(id)
    ON DELETE CASCADE,

    FOREIGN KEY (
        product_id
    )
    REFERENCES products(id)
    ON DELETE CASCADE,

    CHECK (
        side IN ('supply', 'demand')
    )
);

CREATE TABLE IF NOT EXISTS player_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_village_id TEXT NOT NULL,
    money REAL NOT NULL,
    inventory_capacity_crates INTEGER NOT NULL,
    continuous_mode INTEGER NOT NULL,

    FOREIGN KEY (
        current_village_id
    )
    REFERENCES villages(id)
);

CREATE TABLE IF NOT EXISTS optimization_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    period_days INTEGER NOT NULL,
    beam_width INTEGER NOT NULL,
    max_steps INTEGER NOT NULL
);