import express from 'express';
import path from 'path'
import { Pool } from 'pg';

const PORT = 3000;
const app = express();
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Students',
  password: 'postgres',
  port: 5432
})

app
  .use(express.static('public'))
  .use(express.json())
  .use(express.urlencoded({ extended: true }))

app.get('/', (_, response) => {
  response.sendFile(path.join(__dirname, '../public/index.html'))
})

app.get('/channels', async (request, response) => {
  const client = await pool.connect();
  const result = await client.query(/*sql*/ `SELECT * FROM channels ORDER BY name`);
  response.json(result.rows);
})

app.get('/messages/:channelName', async (request, response) => {
  const channelName = request.params.channelName
  const client = await pool.connect();
  const result = await client.query(/*sql*/ `
    SELECT messages.id, messages.content, messages.animal_identity, messages.color_identity
    FROM messages
    INNER JOIN channels ON messages.channel_id = channels.id
    WHERE channels.name = $1;
  `, [channelName]
  )
  response.json(result.rows)
})

app.post('/messages/:channelName', async (request, response) => {
  const { message_content, animal_identity, color_identity } = request.body
  const channelName = request.params.channelName

  console.log(channelName)

  const client = await pool.connect();
  const result = await client.query(`SELECT id FROM channels WHERE name = '${channelName}'`)
  if (result.rows.length === 0) {
    return response.status(404).json({ error: 'channel not found' })
  }

  const channelId = result.rows[0].id
  const table = await client.query( /*sql*/`
    INSERT INTO messages 
    (content, animal_identity, color_identity, channel_id)
    VALUES ('${message_content}', '${animal_identity}', '${color_identity}', ${channelId})
  `)

  response.json(table)
})

app.patch('/messages/:channelName/:id', async (request, response) => {
  const { content, animal_identity, color_identity } = request.body;
  const { id } = request.params;

  try {
    const client = await pool.connect();
    const channelName = request.params.channelName;
    const channelQuery = await client.query('SELECT id FROM channels WHERE name = $1', [channelName])

    if (channelQuery.rows.length === 0) {
      return response.status(404).json({ error: 'Channel not found' });
    }

    const channelId = channelQuery.rows[0].id;

    //update message
    await client.query(/*sql*/`
    UPDATE messages
    SET content = $1
    WHERE id = $2 AND animal_identity = $3 AND color_identity = $4 AND channel_id = $5`,
      [content, id, animal_identity, color_identity, channelId])
    console.log('Message deleted successfully');
    response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error: ', error);
    response.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
})

app.delete('/messages/:channelName/:id', async (request, response) => {
  const { id } = request.params;
  const { animal_identity, color_identity } = request.body;

  try {
    const client = await pool.connect();
    const channelName = request.params.channelName;
    const channelQuery = await client.query('SELECT id FROM channels WHERE name = $1', [channelName]);

    if (channelQuery.rows.length === 0) {
      return response.status(404).json({ error: 'Channel not found' });
    }

    const channelId = channelQuery.rows[0].id;

    // Delete the message
    await client.query(
      'DELETE FROM messages WHERE id = $1 AND channel_id = $2 AND animal_identity = $3 AND color_identity = $4',
      [id, channelId, animal_identity, color_identity]
    );

    console.log('Message deleted successfully');
    response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    response.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log('listening to server http://localhost:' + PORT)
})
