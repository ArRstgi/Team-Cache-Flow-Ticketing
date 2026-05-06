CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    date TIMESTAMP NOT NULL,
    total_seats INTEGER NOT NULL,
    available_seats INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS seats (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    section VARCHAR(50) NOT NULL,
    row VARCHAR(10) NOT NULL,
    seat_number INTEGER NOT NULL,
    is_taken BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (event_id, section, row, seat_number)
);

-- Insert Events
INSERT INTO events (id, name, venue, date, total_seats, available_seats)
VALUES (1, 'Laufey Tour', 'Madison Square Garden', '2025-05-05 15:55:55', 6000, 6000)
ON CONFLICT DO NOTHING;

INSERT INTO events (id, name, venue, date, total_seats, available_seats)
VALUES (2, 'Boston Celtics vs. Thunder', 'TD Garden', '2023-04-15 12:35:00', 6000, 6000)
ON CONFLICT DO NOTHING;

-- Insert 3000 seats for Event 1 (Section 'Main', Rows A-E, Seats 1-600)
INSERT INTO seats (event_id, section, row, seat_number, is_taken)
SELECT 
    1 AS event_id, 
    'Main' AS section, 
    chr(r) AS row, 
    s AS seat_number, 
    FALSE AS is_taken
FROM 
    generate_series(65, 69) AS r, -- ASCII 65=A, 69=E
    generate_series(1, 600) AS s
ON CONFLICT DO NOTHING;

-- Insert 3000 seats for Event 2 (Section 'Main', Rows A-E, Seats 1-600)
INSERT INTO seats (event_id, section, row, seat_number, is_taken)
SELECT 
    2 AS event_id, 
    'Main' AS section, 
    chr(r) AS row, 
    s AS seat_number, 
    FALSE AS is_taken
FROM 
    generate_series(65, 69) AS r, 
    generate_series(1, 600) AS s
ON CONFLICT DO NOTHING;

-- Resync the auto-incrementing sequences after manual inserts
SELECT setval('events_id_seq', (SELECT MAX(id) FROM events));
SELECT setval('seats_id_seq', (SELECT MAX(id) FROM seats));