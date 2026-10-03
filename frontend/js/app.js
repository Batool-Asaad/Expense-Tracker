// Expense Tracker - Frontend
// Handles API requests and page interactions

const API_URL = "http://localhost:3000/api/expenses";

let expenses = [];
let currentSortField = null;
let sortAscending = true;
let categoryChart = null;

const badgeColors = {
    Food: "bg-success",
    Transport: "bg-info",
    Bills: "bg-danger",
    Entertainment: "bg-warning text-dark",
    Other: "bg-secondary"
};


// Show and hide the loading spinner
function showLoading() {
    document.getElementById("loadingSpinner").classList.remove("d-none");
}

function hideLoading() {
    document.getElementById("loadingSpinner").classList.add("d-none");
}


// Show a Bootstrap alert message
function showAlert(message, type) {
    const alertContainer = document.getElementById("alertContainer");

    alertContainer.innerHTML = `
        <div class="alert alert-${type}" role="alert">
            ${message}
        </div>
    `;

    setTimeout(() => {
        alertContainer.innerHTML = "";
    }, 3000);
}


// Get expenses that match the current search and filters
function getFilteredExpenses() {
    const searchText = document
        .getElementById("searchInput")
        .value
        .toLowerCase()
        .trim();

    const selectedCategory =
        document.getElementById("categoryFilter").value;

    const selectedMonth =
        document.getElementById("monthFilter").value;

    return expenses.filter((expense) => {
        const matchesSearch = expense.title
            .toLowerCase()
            .includes(searchText);

        const matchesCategory =
            selectedCategory === "All" ||
            expense.category === selectedCategory;

        const matchesMonth =
            !selectedMonth ||
            expense.date.startsWith(selectedMonth);

        return (
            matchesSearch &&
            matchesCategory &&
            matchesMonth
        );
    });
}


// Validate expense data before sending it to the server
function validateExpense({ title, amount, category, date }) {
    if (!title) {
        return "Title is required.";
    }

    if (!amount || amount <= 0) {
        return "Amount must be greater than 0.";
    }

    if (!category) {
        return "Please select a category.";
    }

    if (!date) {
        return "Date is required.";
    }

    return null;
}


// GET /api/expenses
// Get all expenses from the server
async function fetchExpenses() {
    showLoading();

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Failed to load expenses");
        }

        expenses = await response.json();

        displayExpenses(expenses);
        updateSummary(expenses);
        updateCategoryChart(expenses);
    } catch (error) {
        console.error(error);

        showAlert(
            "Could not load expenses. Make sure the server is running.",
            "danger"
        );
    } finally {
        hideLoading();
    }
}


// Display expenses in the table
function displayExpenses(expensesToDisplay) {
    const tableBody = document.getElementById("expensesTableBody");

    tableBody.innerHTML = "";

    expensesToDisplay.forEach((expense) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${expense.title}</td>

            <td>
                $${Number(expense.amount).toFixed(2)}
            </td>

            <td>
                <span class="badge ${badgeColors[expense.category]}">
                    ${expense.category}
                </span>
            </td>

            <td>
                ${expense.date}
            </td>

            <td>
                <button
                    class="btn btn-sm btn-warning me-1"
                    onclick="openEditModal(${expense.id})"
                >
                    Edit
                </button>

                <button
                    class="btn btn-sm btn-danger"
                    onclick="deleteExpense(${expense.id})"
                >
                    Delete
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}


// Update the summary cards
function updateSummary(expensesToCalculate) {
    const totalAmount = expensesToCalculate.reduce(
        (total, expense) => {
            return total + Number(expense.amount);
        },
        0
    );

    const expenseCount = expensesToCalculate.length;

    const highestExpense =
        expensesToCalculate.length > 0
            ? Math.max(
                ...expensesToCalculate.map(
                    (expense) => Number(expense.amount)
                )
            )
            : 0;

    document.getElementById("totalAmount").textContent =
        `$${totalAmount.toFixed(2)}`;

    document.getElementById("expenseCount").textContent =
        expenseCount;

    document.getElementById("highestExpense").textContent =
        `$${highestExpense.toFixed(2)}`;
}


// POST /api/expenses
// Add a new expense
document
    .getElementById("expenseForm")
    .addEventListener("submit", async (event) => {
        event.preventDefault();

        const title = document
            .getElementById("title")
            .value
            .trim();

        const amount = Number(
            document.getElementById("amount").value
        );

        const category =
            document.getElementById("category").value;

        const date =
            document.getElementById("date").value;

        const validationError = validateExpense({
            title,
            amount,
            category,
            date
        });

        if (validationError) {
            showAlert(validationError, "danger");
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    title,
                    amount,
                    category,
                    date
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to add expense"
                );
            }

            showAlert(
                "Expense added successfully!",
                "success"
            );

            document
                .getElementById("expenseForm")
                .reset();

            await fetchExpenses();
        } catch (error) {
            console.error(error);

            showAlert(
                error.message,
                "danger"
            );
        }
    });


// DELETE /api/expenses/:id
// Delete an expense
async function deleteExpense(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this expense?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/${id}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to delete expense"
            );
        }

        showAlert(
            "Expense deleted successfully!",
            "success"
        );

        await fetchExpenses();
    } catch (error) {
        console.error(error);

        showAlert(
            error.message,
            "danger"
        );
    }
}


// Search and filter expenses
function applyFilters() {
    const filteredExpenses = getFilteredExpenses();

    displayExpenses(filteredExpenses);

    // Summary shows all expenses
    updateSummary(expenses);

    // Chart shows the filtered expenses
    updateCategoryChart(filteredExpenses);
}

document
    .getElementById("searchInput")
    .addEventListener("input", applyFilters);

document
    .getElementById("categoryFilter")
    .addEventListener("change", applyFilters);

document
    .getElementById("monthFilter")
    .addEventListener("change", applyFilters);


// Open the edit modal and fill it with the selected expense
function openEditModal(id) {
    const expense = expenses.find(
        (expense) => expense.id === id
    );

    if (!expense) {
        return;
    }

    document.getElementById("editId").value =
        expense.id;

    document.getElementById("editTitle").value =
        expense.title;

    document.getElementById("editAmount").value =
        expense.amount;

    document.getElementById("editCategory").value =
        expense.category;

    document.getElementById("editDate").value =
        expense.date;

    const modal = new bootstrap.Modal(
        document.getElementById("editModal")
    );

    modal.show();
}


// PUT /api/expenses/:id
// Update an existing expense
document
    .getElementById("editForm")
    .addEventListener("submit", async (event) => {
        event.preventDefault();

        const id =
            document.getElementById("editId").value;

        const title = document
            .getElementById("editTitle")
            .value
            .trim();

        const amount = Number(
            document.getElementById("editAmount").value
        );

        const category =
            document.getElementById("editCategory").value;

        const date =
            document.getElementById("editDate").value;

        const validationError = validateExpense({
            title,
            amount,
            category,
            date
        });

        if (validationError) {
            showAlert(validationError, "danger");
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/${id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        title,
                        amount,
                        category,
                        date
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to update expense"
                );
            }

            showAlert(
                "Expense updated successfully!",
                "success"
            );

            const modalElement =
                document.getElementById("editModal");

            const modal =
                bootstrap.Modal.getInstance(
                    modalElement
                );

            if (modal) {
                modal.hide();
            }

            await fetchExpenses();
        } catch (error) {
            console.error(error);

            showAlert(
                error.message,
                "danger"
            );
        }
    });

// Sort expenses by a table column
function sortExpenses(field) {
    if (currentSortField === field) {
        sortAscending = !sortAscending;
    } else {
        currentSortField = field;
        sortAscending = true;
    }

    const sortedExpenses = [
        ...getFilteredExpenses()
    ];

    sortedExpenses.sort((a, b) => {
        let valueA = a[field];
        let valueB = b[field];

        if (field === "amount") {
            valueA = Number(valueA);
            valueB = Number(valueB);

            return sortAscending
                ? valueA - valueB
                : valueB - valueA;
        }

        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();

        if (valueA < valueB) {
            return sortAscending ? -1 : 1;
        }

        if (valueA > valueB) {
            return sortAscending ? 1 : -1;
        }

        return 0;
    });

    displayExpenses(sortedExpenses);
}


// Update the category chart
function updateCategoryChart(expensesToDisplay) {
    const categoryTotals = {
        Food: 0,
        Transport: 0,
        Bills: 0,
        Entertainment: 0,
        Other: 0
    };

    expensesToDisplay.forEach((expense) => {
        categoryTotals[expense.category] +=
            Number(expense.amount);
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    const chartCanvas =
        document.getElementById("categoryChart");

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(chartCanvas, {
        type: "bar",

        data: {
            labels,

            datasets: [
                {
                    label: "Amount",
                    data: values
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}


// Export the current filtered expenses as CSV
function exportExpensesToCSV() {
    const filteredExpenses =
        getFilteredExpenses();

    if (filteredExpenses.length === 0) {
        showAlert(
            "There are no expenses to export.",
            "warning"
        );

        return;
    }

    const headers = [
        "ID",
        "Title",
        "Amount",
        "Category",
        "Date"
    ];

    const rows = filteredExpenses.map((expense) => {
        return [
            expense.id,
            `"${expense.title.replace(/"/g, '""')}"`,
            Number(expense.amount).toFixed(2),
            expense.category,
            expense.date
        ];
    });

    const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(","))
    ].join("\n");

    const blob = new Blob(
        [csvContent],
        {
            type: "text/csv;charset=utf-8;"
        }
    );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;
    link.download = "expenses.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showAlert(
        "Expenses exported successfully!",
        "success"
    );
}

document
    .getElementById("exportCsvButton")
    .addEventListener(
        "click",
        exportExpensesToCSV
    );


// Toggle between dark mode and light mode
const darkModeButton =
    document.getElementById("darkModeButton");

darkModeButton.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    if (document.body.classList.contains("dark-mode")) {
        darkModeButton.textContent =
            "☀️ Light Mode";
    } else {
        darkModeButton.textContent =
            "🌙 Dark Mode";
    }
});


// Load expenses when the page opens
fetchExpenses();