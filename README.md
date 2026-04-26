# 💰 Expense Tracker Pro – Smart Personal Finance Manager

[![PHP Version](https://img.shields.io/badge/PHP-7.4%2B-blue)](https://php.net)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)](https://developer.mozilla.org)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4-ff69b4)](https://www.chartjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

A **professional, full‑featured expense tracking web application** with built‑in **machine learning** (linear regression) for spending forecasts. Manage your personal finances with budgets, recurring expenses, interactive charts, CSV/PDF export, and a modern responsive UI – all powered by a lightweight PHP/JSON backend.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Expense+Tracker+Pro+Screenshot)

---

## ✨ Features

### Core Features
- ✅ **Expense Management** – Add, edit, delete, search, and filter expenses by date/category.
- ✅ **Category Management** – Create custom categories with colours and monthly budget limits.
- ✅ **Budget Tracking** – Visual progress bars + alerts when nearing or exceeding budgets.
- ✅ **Recurring Expenses** – Weekly/monthly automated entries (client‑side simulation).

### Analytics & Reporting
- 📊 **Interactive Charts** – Expense distribution (pie), monthly trend (bar), cumulative spending (line) – powered by Chart.js.
- 📅 **Date Range Picker** – Custom reports for any period.
- 📎 **Export** – Download reports as CSV or PDF.

### Machine Learning Module
- 🤖 **Spending Forecast** – Uses **linear regression** on historical monthly data to predict next month’s expenses.
- 📈 **Anomaly Detection** – Flags unusually large expenses based on standard deviation.

### User Experience
- 🌓 **Dark / Light Mode** – Toggle with persistent user preference.
- 📱 **Fully Responsive** – Works on desktop, tablet, and mobile.
- 🔔 **Toast Notifications** – Instant feedback for all actions.
- 💾 **Data Backup/Restore** – Export/import all data as JSON.

---

## 🛠️ Tech Stack

| Layer       | Technology                                          |
|-------------|-----------------------------------------------------|
| Backend     | PHP 7.4+ (REST API, JSON file storage)             |
| Frontend    | Vanilla JavaScript (ES6), HTML5, CSS3              |
| Charts      | Chart.js                                            |
| ML Model    | Linear Regression (implemented in pure JavaScript) |
| Icons       | Font Awesome 6                                      |
| Export      | SheetJS (XLSX) + jsPDF (optional)                  |

---

## 📁 Project Structure
expense-tracker-pro/
├── index.php # Main dashboard (HTML + PHP container)
├── backend.php # REST API (CRUD, budgets, recurring)
├── script.js # Core frontend logic (state, UI, API calls)
├── styles.css # Professional responsive styling
├── ml-model.js # Linear regression forecasting
├── main.js # Orchestrates modules + init
├── categories.json # Stores categories + monthly budgets
├── expenses.json # Stores all expense records
├── recurring.json # Recurring expense definitions
├── settings.json # User preferences (currency, theme)
└── .htaccess # Optional URL rewriting


---

## 🚀 Installation & Setup

### Prerequisites
- PHP 7.4 or higher
- Web server (Apache / Nginx / PHP built‑in server)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/expense-tracker-pro.git
   cd expense-tracker-pro

   chmod 666 categories.json expenses.json recurring.json settings.json

   php -S localhost:8000

   http://localhost:8000
