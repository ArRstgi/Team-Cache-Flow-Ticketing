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
    const result = await pool.query('SELECT id, section, row, seat_number FROM seats WHERE event_id = $1', [id]);
    
    await redisClient.setEx(cacheKey, 60, JSON.stringify(result.rows));
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(`[Replica ${replicaId}] Error fetching seat map:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



initializeDependencies().then(() => {
  app.listen(port, () => {
    console.log(`[Replica ${replicaId}] Event Catalog Service listening on port ${port}`);
  });
});