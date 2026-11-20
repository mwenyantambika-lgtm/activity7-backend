const router = require("express").Router();
const pool = require("../db");

const STATUSES = ["Pending", "In progress", "Completed"];

// Check that an id is a positive whole number
function isValidId(value) {
  return /^[1-9][0-9]*$/.test(value);
}

// The bouncer: checks the four editable fields from the data agreement
function validateRecord(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object." };
  }

  const fields = ["title", "category", "description", "status"];
  for (const field of fields) {
    if (typeof body[field] !== "string") {
      return { error: `${field} is required and must be text.` };
    }
  }

  const title = body.title.trim();
  const category = body.category.trim();
  const description = body.description.trim();
  const status = body.status.trim();

  if (title.length < 3 || title.length > 80) {
    return { error: "Title must have 3 to 80 characters." };
  }
  if (category.length < 2 || category.length > 40) {
    return { error: "Category must have 2 to 40 characters." };
  }
  if (description.length < 5 || description.length > 300) {
    return { error: "Description must have 5 to 300 characters." };
  }
  if (!STATUSES.includes(status)) {
    return { error: "Status must be Pending, In progress or Completed." };
  }

  return { values: { title, category, description, status } };
}

// GET all records
router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, title, category, description, status " +
      "FROM records ORDER BY id"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET one record
router.get("/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Id must be a positive whole number." });
    }
    const result = await pool.query(
      "SELECT id, title, category, description, status " +
      "FROM records WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Record not found." });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST create a record
router.post("/", async (req, res, next) => {
  try {
    const check = validateRecord(req.body);
    if (check.error) {
      return res.status(400).json({ message: check.error });
    }
    const { title, category, description, status } = check.values;

    const result = await pool.query(
      "INSERT INTO records (title, category, description, status) " +
      "VALUES ($1, $2, $3, $4) " +
      "RETURNING id, title, category, description, status",
      [title, category, description, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
// PUT update a record
router.put("/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Id must be a positive whole number." });
    }
    const check = validateRecord(req.body);
    if (check.error) {
      return res.status(400).json({ message: check.error });
    }
    const { title, category, description, status } = check.values;

    const result = await pool.query(
      "UPDATE records SET title = $1, category = $2, description = $3, status = $4 " +
      "WHERE id = $5 " +
      "RETURNING id, title, category, description, status",
      [title, category, description, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Record not found." });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;