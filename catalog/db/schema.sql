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
VALUES (1, 'Laufey Tour', 'Madison Square Garden', '2025-05-05 15:55:55', 55000, 55000)
ON CONFLICT DO NOTHING;

INSERT INTO events (id, name, venue, date, total_seats, available_seats)
VALUES (2, 'Boston Celtics vs. Thunder', 'TD Garden', '2023-04-15 12:35:00', 50000, 30000)
ON CONFLICT DO NOTHING;

-- Insert a small mock seat map for Event 1 
INSERT INTO seats (event_id, section, row, seat_number, is_taken)
VALUES 
    (1, 'VIP', 'A', 1, FALSE),
    (1, 'VIP', 'A', 2, FALSE),
    (1, 'VIP', 'A', 3, FALSE),
    (1, '101', 'G', 15, FALSE),
    (1, '101', 'G', 16, FALSE)
ON CONFLICT DO NOTHING;

-- Insert a small mock seat map for Event 2 
INSERT INTO seats (event_id, section, row, seat_number, is_taken)
VALUES 
    (2, 'Courtside', '1', 1, FALSE),
    (2, 'Courtside', '1', 2, FALSE),
    (2, 'Loge', '12', 5, FALSE)
ON CONFLICT DO NOTHING;

-- Resync the auto-incrementing sequences after manual inserts
SELECT setval('events_id_seq', (SELECT MAX(id) FROM events));
SELECT setval('seats_id_seq', (SELECT MAX(id) FROM seats));