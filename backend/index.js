const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const recipeRoutes = require('./routes/recipes');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'recipe',
  password: process.env.DB_PASSWORD || 'recipe123',
  database: process.env.DB_NAME || 'recipeapp',
  port: 5432
});

app.locals.pool = pool;

app.use('/api/recipes', recipeRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
 
