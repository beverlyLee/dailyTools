-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- CITIES table
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(100),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ATTRACTIONS table
CREATE TABLE IF NOT EXISTS attractions (
    id SERIAL PRIMARY KEY,
    city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    entry_fee DECIMAL(10, 2) DEFAULT 0,
    visit_duration INTEGER DEFAULT 60,
    rating DECIMAL(3, 2),
    open_time TIME,
    close_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RESTAURANTS table
CREATE TABLE IF NOT EXISTS restaurants (
    id SERIAL PRIMARY KEY,
    city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    cuisine_type VARCHAR(100),
    avg_price DECIMAL(10, 2),
    rating DECIMAL(3, 2),
    open_time TIME,
    close_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ITINERARIES table
CREATE TABLE IF NOT EXISTS itineraries (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100),
    title VARCHAR(200) NOT NULL,
    city_id INTEGER REFERENCES cities(id),
    start_date DATE,
    end_date DATE,
    total_budget DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ITINERARY_ITEMS table
CREATE TABLE IF NOT EXISTS itinerary_items (
    id SERIAL PRIMARY KEY,
    itinerary_id INTEGER REFERENCES itineraries(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    attraction_id INTEGER REFERENCES attractions(id),
    restaurant_id INTEGER REFERENCES restaurants(id),
    day_number INTEGER NOT NULL,
    start_time TIME,
    end_time TIME,
    cost DECIMAL(10, 2),
    notes TEXT,
    sequence_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SPATIAL INDEXES
CREATE INDEX IF NOT EXISTS idx_cities_location ON cities USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_attractions_location ON attractions USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants USING GIST(location);

-- OTHER INDEXES
CREATE INDEX IF NOT EXISTS idx_attractions_city ON attractions(city_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_itinerary ON itinerary_items(itinerary_id);
