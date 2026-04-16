const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

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
  
  // Run schema to initialize DB tables
  try {
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Database schema initialized.');
  } catch (error) {
    console.error('Failed to initialize schema:', error);
  }
}

// GET /health
app.get('/health', async (req, res) => {
  let dbStatus = 'unreachable';
  let redisStatus = 'unreachable';
  let statusCode = 200;

  // Check Database
  try {
    await pool.query('SELECT 1');
    dbStatus = 'healthy';
  } catch (error) {
    statusCode = 503;
  }

  // Check Redis
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
    const result = await pool.query('SELECT * FROM events');
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Core Endpoint: Get Specific Event
app.get('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

initializeDependencies().then(() => {
  app.listen(port, () => {
    console.log(`Event Catalog Service listening on port ${port}`);
  });
});