// Expense Tracker - Backend
// Express API + PostgreSQL

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = 3000;

const allowedCategories = [
    "Food",
    "Transport",
    "Bills",
    "Entertainment",
    "Other"
];

// Create a connection pool for PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

// Middleware
app.use(cors());
app.use(express.json());

// SQL used to return an expense in the format expected by the frontend
const expenseFields = `
    id,
    title,
    amount::float8 AS amount,
    category,
    to_char(date, 'YYYY-MM-DD') AS date
`;

// Check whether an ID is a valid positive integer
function isValidId(id) {
    return Number.isInteger(id) && id > 0;
}

// Validate the data sent when creating or updating an expense
function validateExpense({ title, amount, category, date }) {
    if (!title || typeof title !== "string") {
        return "Title is required";
    }

    if (
        amount === undefined ||
        typeof amount !== "number" ||
        amount <= 0
    ) {
        return "Amount must be a number greater than 0";
    }

    if (!allowedCategories.includes(category)) {
        return "Invalid category";
    }

    if (!date || typeof date !== "string") {
        return "Date is required";
    }

    return null;
}


// GET /api/expenses
// Return all expenses
app.get("/api/expenses", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ${expenseFields}
            FROM expenses
            ORDER BY id
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});


// GET /api/expenses/:id
// Return one expense
app.get("/api/expenses/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
        return res.status(404).json({
            message: "Expense not found"
        });
    }

    try {
        const result = await pool.query(
            `
            SELECT ${expenseFields}
            FROM expenses
            WHERE id = $1  
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});


// POST /api/expenses
// Add a new expense
app.post("/api/expenses", async (req, res) => {
    const { title, amount, category, date } = req.body;

    const validationError = validateExpense({
        title,
        amount,
        category,
        date
    });

    if (validationError) {
        return res.status(400).json({
            message: validationError
        });
    }

    try {
        const result = await pool.query(
            `
            INSERT INTO expenses (title, amount, category, date)
            VALUES ($1, $2, $3, $4)
            RETURNING ${expenseFields}
            `,
            [title, amount, category, date]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});


// PUT /api/expenses/:id
// Update an existing expense
app.put("/api/expenses/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
        return res.status(404).json({
            message: "Expense not found"
        });
    }

    const { title, amount, category, date } = req.body;

    const validationError = validateExpense({
        title,
        amount,
        category,
        date
    });

    if (validationError) {
        return res.status(400).json({
            message: validationError
        });
    }

    try {
        const result = await pool.query(
            `
            UPDATE expenses
            SET
                title = $1,
                amount = $2,
                category = $3,
                date = $4
            WHERE id = $5
            RETURNING ${expenseFields}
            `,
            [title, amount, category, date, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});


// DELETE /api/expenses/:id
// Delete an expense
app.delete("/api/expenses/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
        return res.status(404).json({
            message: "Expense not found"
        });
    }

    try {
        const result = await pool.query(
            `
            DELETE FROM expenses
            WHERE id = $1
            RETURNING id
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        res.json({
            message: "Expense deleted successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});