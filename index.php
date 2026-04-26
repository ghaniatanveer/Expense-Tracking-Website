<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Expense Tracker Pro</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="app">
        <header class="topbar">
            <h1><i class="fa-solid fa-wallet"></i> Expense Tracker Pro</h1>
            <div class="topbar-actions">
                <select id="currency-select" title="Currency">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (EUR)</option>
                    <option value="GBP">GBP (GBP)</option>
                    <option value="INR">INR (INR)</option>
                </select>
                <button id="theme-toggle" class="ghost-btn" type="button"><i class="fa-solid fa-moon"></i> Theme</button>
            </div>
        </header>

        <section class="cards" id="metric-cards">
            <article class="card"><h3>Total Expenses</h3><p id="total-expenses">$0.00</p></article>
            <article class="card"><h3>This Month</h3><p id="month-expenses">$0.00</p></article>
            <article class="card"><h3>Next Month Forecast</h3><p id="forecast-value">$0.00</p><small id="forecast-confidence">Confidence: n/a</small></article>
            <article class="card"><h3>Overall Budget</h3><p id="overall-budget-status">$0.00 / $0.00</p></article>
        </section>

        <section class="panel">
            <h2>Quick Add Expense</h2>
            <form id="expense-form" class="grid-form">
                <input type="text" id="expense-name" placeholder="Expense name" required>
                <input type="number" id="expense-amount" placeholder="Amount" step="0.01" min="0.01" required>
                <select id="expense-category" required></select>
                <input type="date" id="expense-date" required>
                <input type="text" id="expense-tags" placeholder="Tags (comma separated)">
                <input type="text" id="expense-notes" placeholder="Notes">
                <label><input type="checkbox" id="expense-recurring"> Recurring</label>
                <select id="expense-recurring-period">
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                </select>
                <button type="submit" class="primary-btn">Save Expense</button>
            </form>
        </section>

        <section class="panel">
            <h2>Category Management</h2>
            <form id="category-form" class="inline-form">
                <input type="text" id="category-name" placeholder="Category name" required>
                <input type="color" id="category-color" value="#5A67D8" required>
                <input type="number" id="category-budget" placeholder="Monthly budget" step="0.01" min="0">
                <button type="submit" class="primary-btn">Add Category</button>
            </form>
            <div id="category-list" class="chip-list"></div>
        </section>

        <section class="panel">
            <h2>Filters & Reports</h2>
            <div class="filters">
                <input type="search" id="search-input" placeholder="Search expenses...">
                <select id="filter-category"><option value="">All categories</option></select>
                <input type="date" id="filter-from">
                <input type="date" id="filter-to">
                <button id="apply-filter" type="button">Apply</button>
                <button id="clear-filter" type="button">Clear</button>
                <button id="export-csv" type="button">Export CSV</button>
                <button id="export-pdf" type="button">Export PDF</button>
                <button id="backup-json" type="button">Backup JSON</button>
                <label class="import-btn">Restore JSON<input type="file" id="restore-json" accept=".json"></label>
            </div>
        </section>

        <section class="panel">
            <h2>Expense Table</h2>
            <table id="expense-table">
                <thead>
                    <tr>
                        <th data-sort="name">Name</th>
                        <th data-sort="amount">Amount</th>
                        <th data-sort="category">Category</th>
                        <th data-sort="date">Date</th>
                        <th>Tags</th>
                        <th>Notes</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="expense-table-body"></tbody>
            </table>
        </section>

        <section class="panel">
            <h2>Budget Tracking</h2>
            <form id="overall-budget-form" class="inline-form">
                <input type="number" id="overall-budget-input" step="0.01" min="0" placeholder="Overall monthly budget">
                <button class="primary-btn" type="submit">Save Overall Budget</button>
            </form>
            <div id="budget-progress" class="budget-grid"></div>
        </section>

        <section class="panel charts">
            <div class="chart-card"><h3>By Category</h3><canvas id="pie-chart"></canvas></div>
            <div class="chart-card"><h3>Monthly Trend</h3><canvas id="bar-chart"></canvas></div>
            <div class="chart-card"><h3>Cumulative Spend</h3><canvas id="line-chart"></canvas></div>
        </section>

        <section class="panel">
            <h2>Recurring Expenses</h2>
            <div id="recurring-list"></div>
        </section>

        <div id="toast-container" class="toast-container"></div>
    </div>

    <script type="module" src="main.js"></script>
</body>
</html>
