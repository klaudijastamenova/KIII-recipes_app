const express = require('express');
const router = express.Router();


router.get('/', async (req, res) => {
  const pool = req.app.locals.pool;
  const { ingredient, category } = req.query; // за идно филтрирање

  try {
    let recipesResult;

    if (ingredient) {
      recipesResult = await pool.query(
        `SELECT DISTINCT r.*
         FROM recipes r
         JOIN recipe_ingredients ri ON r.id = ri.recipe_id
         JOIN ingredients i ON ri.ingredient_id = i.id
         WHERE i.name ILIKE $1`,
        [`%${ingredient}%`]
      );
    } else if (category) {
      recipesResult = await pool.query(
        `SELECT * FROM recipes WHERE category = $1`,
        [category]
      );
    } else {
      recipesResult = await pool.query('SELECT * FROM recipes');
    }

    const recipes = recipesResult.rows;

    
    for (let recipe of recipes) {
      const ingResult = await pool.query(
        `SELECT i.name, ri.quantity
         FROM recipe_ingredients ri
         JOIN ingredients i ON ri.ingredient_id = i.id
         WHERE ri.recipe_id = $1`,
        [recipe.id]
      );
      recipe.ingredients = ingResult.rows;
      recipe.showIngredients = false;
    }

    res.json(recipes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


router.post('/', async (req, res) => {
  const pool = req.app.locals.pool;
  const { title, category, ingredients } = req.body;

  if (!title || !category || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO recipes (title, category) VALUES ($1, $2) RETURNING *`,
      [title, category]
    );
    const recipe = result.rows[0];

    for (let ing of ingredients) {
      let ingredientId;

      const ingResult = await pool.query(
        `SELECT id FROM ingredients WHERE name = $1`,
        [ing.name]
      );

      if (ingResult.rows.length > 0) {
        ingredientId = ingResult.rows[0].id;
      } else {
        const newIng = await pool.query(
          `INSERT INTO ingredients (name) VALUES ($1) RETURNING id`,
          [ing.name]
        );
        ingredientId = newIng.rows[0].id;
      }

      await pool.query(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES ($1, $2, $3)`,
        [recipe.id, ingredientId, ing.quantity]
      );
    }

    res.status(201).json(recipe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


router.delete('/:id', async (req, res) => {
  const pool = req.app.locals.pool;
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);
    await pool.query('DELETE FROM recipes WHERE id = $1', [id]);

    res.json({ message: 'Recipe deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
