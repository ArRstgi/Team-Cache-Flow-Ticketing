CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    date TIMESTAMP NOT NULL,
    total_seats INTEGER NOT NULL,
    available_seats INTEGER NOT NULL
);

INSERT INTO events (name, venue, date, total_seats, available_seats)
SELECT 'Taylor Swift Eras Tour', 'Gillette Stadium', '2026-07-15 19:00:00', 65000, 65000
WHERE NOT EXISTS (SELECT 1 FROM events);

INSERT INTO events (name, venue, date, total_seats, available_seats)
SELECT 'Boston Celtics vs. Lakers', 'TD Garden', '2026-11-05 19:30:00', 19580, 19580
WHERE NOT EXISTS (SELECT 1 FROM events);