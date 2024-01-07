// // Importing necessary modules
// const express = require('express');
import express from 'express';
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path')

// Setting up the PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Students',
  password: 'postgres',
  port: 5432,
});

async function startServer() {
  // Initializing express app and database connection
  const app = express();
  const connection = await pool.connect();

  app
    .use(express.static('public'))
    .use(express.json())
    .use(express.urlencoded({ extended: true }))

  app.get('/', (_, response) => {
    response.sendFile(path.join(__dirname, './index.html'))
  })

  // Route to get all channels
  app.get('/channels', async (_, response: express.Response) => {
    const result = await connection.query('SELECT * FROM channels ORDER BY name');
    response.json(result.rows);
  });

  // Route to get messages by channel name
  app.get('/messages/:channelName', async (request: express.Request, response: express.Response) => {
    const result = await connection.query(
      /* sql */ `
      SELECT messages.* FROM messages 
      INNER JOIN channels ON messages.channel_id = channels.id 
      WHERE name = $1
    `,
      [request.params.channelName],
    );
    console.log('DB results', result.rows);
    response.json(result.rows);
  });

  // Route to update a message by id
  app.put('/messages/:id', async (request: express.Request, response:express.Response) => {
    const { id } = request.params;
    const { text } = request.body;
    const result = await connection.query(
      /* sql */ `
      UPDATE messages
      SET text = $1
      WHERE id = $2
    `,
      [text, id],
    );
    response.json(result.rows);
  });

  // Route to delete a message by id
  app.delete('/messages/:id', async (request, response) => {
    const { id } = request.params;
    const result = await connection.query(
      /* sql */ `
      DELETE FROM messages
      WHERE id = $1
    `,
      [id],
    );
    response.json(result.rows);
  });

  // Serving static files from the 'public' directory
  app.use(express.static('public'));

  // Starting the server
  app.listen(3000, () => {
    console.log('Server has started at http://localhost:3000');
  });
}

// Starting the server
startServer();