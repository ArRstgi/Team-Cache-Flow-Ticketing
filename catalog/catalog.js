const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('redis');
const os = require('os');

const app = express();
const port = process.env.PORT || 3000;

// Grab the container's unique ID to identify the replica
const replicaId = os.hostname(); 

app.use(express.json());

// Initialize Database Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Redis Client
const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

async function initializeDependencies() {
  await redisClient.connect();
  console.log(`[Replica ${replicaId}] Connected to Redis and DB.`);
  // Schema initialization has been moved to docker compose (postgres entrypoint)
  // to ensure it only runs once and prevents deadlocks.
}

// GET /health
app.get('/health', async (req, res) => {
  let dbStatus = 'unreachable';
  let redisStatus = 'unreachable';
  let statusCode = 200;

  try {
    await pool.query('SELECT 1');
    dbStatus = 'healthy';
  } catch (error) {
    statusCode = 503;
  }

  try {
    if (redisClient.isReady) {
      await redisClient.ping();
      redisStatus = 'healthy';
    } else {
      statusCode = 503;
    }
  } catch (error) {
    statusCode = 503;
  }

  res.status(statusCode).json({
    service_instance: replicaId,
    status: statusCode === 200 ? 'healthy' : 'unhealthy',
    checks: {
      database: { status: dbStatus },
      redis: { status: redisStatus }
    }
  });
});

// Core Endpoint: List Events
app.get('/events', async (req, res) => {
  try {
    const cachedEvents = await redisClient.get('events:all');
    if (cachedEvents) {
      console.log(`[Replica ${replicaId}] Cache hit for /events`);
      return res.status(200).json(JSON.parse(cachedEvents));
    }

    console.log(`[Replica ${replicaId}] Cache miss for /events. Querying database...`);
    const result = await pool.query('SELECT * FROM events');
    
    await redisClient.setEx('events:all', 60, JSON.stringify(result.rows));
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Core Endpoint: Get Specific Event
app.get('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `events:${id}`;

    const cachedEvent = await redisClient.get(cacheKey);
    if (cachedEvent) {
      console.log(`[Replica ${replicaId}] Cache hit for /events/${id}`);
      return res.status(200).json(JSON.parse(cachedEvent));
    }

    console.log(`[Replica ${replicaId}] Cache miss for /events/${id}. Querying database...`);
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await redisClient.setEx(cacheKey, 60, JSON.stringify(result.rows[0]));
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Core Endpoint: Get Seat Map for Specific Event
app.get('/events/:id/seats', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `events:${id}:seats`;

    const cachedSeats = await redisClient.get(cacheKey);
    if (cachedSeats) {
      console.log(`[Replica ${replicaId}] Cache hit for /events/${id}/seats`);
      return res.status(200).json(JSON.parse(cachedSeats));
    }

    console.log(`[Replica ${replicaId}] Cache miss for /events/${id}/seats. Querying database...`);
    
    // UPDATED: Added is_taken to the SELECT query
    const result = await pool.query(
      'SELECT id, section, row, seat_number, is_taken FROM seats WHERE event_id = $1', 
      [id]
    );
    
    await redisClient.setEx(cacheKey, 60, JSON.stringify(result.rows));
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(`[Replica ${replicaId}] Error fetching seat map:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Core Endpoint: Get Specific Seat Status by Row and Seat Number (e.g., A2)
app.get('/events/:eventId/seats/:seatLabel', async (req, res) => {
  try {
    const { eventId, seatLabel } = req.params;
    
    // Normalize the label to uppercase for the cache key (e.g., 'a2' becomes 'A2')
    const normalizedLabel = seatLabel.toUpperCase();
    
    // Updated cache key to reflect that we are only storing the boolean status
    const cacheKey = `events:${eventId}:seats:label:${normalizedLabel}:status`;

    // Check Redis Cache
    const cachedStatus = await redisClient.get(cacheKey);
    if (cachedStatus !== null) {
      console.log(`[Replica ${replicaId}] Cache hit for /events/${eventId}/seats/${normalizedLabel}`);
      // Convert the cached string 'true' or 'false' back to a literal boolean
      return res.status(200).json(cachedStatus === 'true');
    }

    console.log(`[Replica ${replicaId}] Cache miss for /events/${eventId}/seats/${normalizedLabel}. Querying database...`);
    
    // Query Database: We only need to SELECT is_taken now
    const result = await pool.query(
      `SELECT is_taken 
       FROM seats 
       WHERE event_id = $1 AND UPPER(CONCAT(row, seat_number)) = $2`, 
      [eventId, normalizedLabel]
    );
    
    // Handle Seat Not Found
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Seat ${normalizedLabel} not found for this event` });
    }

    const isTaken = result.rows[0].is_taken;

    // Cache the boolean result as a string for 60 seconds
    await redisClient.setEx(cacheKey, 60, String(isTaken));
    
    // Return just the literal boolean
    res.status(200).json(isTaken);
  } catch (error) {
    console.error(`[Replica ${replicaId}] Error fetching seat status:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Core Endpoint: Mark a Specific Seat as Taken
app.post('/events/:eventId/mark/:seatLabel', async (req, res) => {
  try {
    const { eventId, seatLabel } = req.params;
    const normalizedLabel = seatLabel.toUpperCase();

    // 1. Attempt to update the seat to taken IF it is currently false
    const updateResult = await pool.query(
      `UPDATE seats 
       SET is_taken = TRUE 
       WHERE event_id = $1 AND UPPER(CONCAT(row, seat_number)) = $2 AND is_taken = FALSE 
       RETURNING id, section, row, seat_number`,
      [eventId, normalizedLabel]
    );

    // 2. Check if the update was successful
    if (updateResult.rows.length === 0) {
      // It failed. Let's query the DB to find out why.
      const checkResult = await pool.query(
        `SELECT is_taken FROM seats WHERE event_id = $1 AND UPPER(CONCAT(row, seat_number)) = $2`,
        [eventId, normalizedLabel]
      );

      if (checkResult.rows.length === 0) {
        // The seat label doesn't exist in the database at all
        return res.status(404).json({ 
          success: false, 
          error: `Seat ${normalizedLabel} not found for this event` 
        });
      } else {
        // The seat exists, but is_taken was already TRUE
        return res.status(409).json({ 
          success: false, 
          error: `Seat ${normalizedLabel} is already taken` 
        });
      }
    }

    // 3. Success! Invalidate and update relevant Redis caches
    const seatMapCacheKey = `events:${eventId}:seats`;
    const seatStatusCacheKey = `events:${eventId}:seats:label:${normalizedLabel}:status`;
    
    // Delete the full seat map cache so the next request gets fresh data
    await redisClient.del(seatMapCacheKey);
    // Overwrite the specific seat status cache to true
    await redisClient.setEx(seatStatusCacheKey, 60, 'true'); 

    // 4. Return success response
    res.status(200).json({ 
      success: true, 
      message: `Seat ${normalizedLabel} successfully marked as taken`,
      seat: updateResult.rows[0]
    });

  } catch (error) {
    console.error(`[Replica ${replicaId}] Error marking seat as taken:`, error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Core Endpoint: Create New Event and Initialize Seats
app.post('/events', async (req, res) => {
  const { name, venue, date, total_seats, seats } = req.body;

  // Validate request body
  if (!name || !venue || !date || total_seats === undefined || !seats || !Array.isArray(seats)) {
    return res.status(400).json({ 
      error: 'Missing required fields. Please provide name, venue, date, total_seats, and a seats array.' 
    });
  }

  // Check that the seats array length matches the total_seats count
  if (seats.length !== total_seats) {
    return res.status(400).json({
      error: `total_seats is ${total_seats}, but you provided ${seats.length} seats in the array.`
    });
  }

  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // 1. Insert into events table
    // We set available_seats = total_seats immediately upon creation
    const eventInsertQuery = `
      INSERT INTO events (name, venue, date, total_seats, available_seats)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const eventResult = await client.query(eventInsertQuery, [name, venue, date, total_seats, total_seats]);
    const newEvent = eventResult.rows[0];
    const eventId = newEvent.id;

    // 2. Insert into seats table
    if (seats.length > 0) {
      const seatValues = [];
      const seatParams = [];
      let paramIndex = 1;

      // Build a parameterized bulk insert query
      for (const seat of seats) {
        seatValues.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        seatParams.push(eventId, seat.section, seat.row, seat.seat_number);
      }

      const seatsInsertQuery = `
        INSERT INTO seats (event_id, section, row, seat_number)
        VALUES ${seatValues.join(', ')}
      `;
      await client.query(seatsInsertQuery, seatParams);
    }

    // Commit transaction
    await client.query('COMMIT');

    // 3. Invalidate the events cache so the new event appears in GET /events
    await redisClient.del('events:all');

    console.log(`[Replica ${replicaId}] Successfully created event ID ${eventId} with ${total_seats} seats.`);
    res.status(201).json({ 
      message: 'Event and seats created successfully', 
      event: newEvent 
    });

  } catch (error) {
    // If anything fails, rollback the whole transaction
    await client.query('ROLLBACK');
    console.error(`[Replica ${replicaId}] Error creating event:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    // Always release the client back to the pool
    client.release();
  }
});

initializeDependencies().then(() => {
  app.listen(port, () => {
    console.log(`[Replica ${replicaId}] Event Catalog Service listening on port ${port}`);
  });
});