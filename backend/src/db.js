import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
  host:     process.env.DB_HOST,
  port:    +process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false // if your RDS requires SSL
  },
  max:              2,
  idleTimeoutMillis: 10000,
});

// An idle pooled client can be dropped by the network (e.g. read ETIMEDOUT). Without a listener, pg re-emits that
// as an unhandled 'error' event and the process exits. The pool discards the broken client and opens a new one on
// the next query, so logging is all that is needed here.
pool.on('error', err => {
  console.error('pg pool: idle client error (client discarded):', err.code || err.message);
});

