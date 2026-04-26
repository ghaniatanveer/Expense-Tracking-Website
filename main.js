import {
    api, store, toast, formatCurrency, filteredExpenses, computeMetrics, renderExpensesTable,
    renderCategorySelectors, renderCategoryList, renderRecurring, exportCsv, exportPdf, backupJson, restoreJson
} from './script.js';
import { predictNextMonth, detectAnomalies } from './ml-model.js';

async function boot() {
    bindStaticEvents();
    await runRecurringGeneration();
    await refreshState();
}

async function refreshState() {
    let [categories, expenses, recurring, settings] = await Promise.all([
        api.getAll('categories'),
        api.getAll('expenses'),
        api.getAll('recurring'),
        api.getAll('settings')
    ]);

    if (!categories.length) {
        await seedDefaultCategories();
        categories = await api.getAll('categories');
    }

    store.set({ categories, expenses, recurring, settings: { ...store.state.settings, ...settings } });
    applyTheme();
    renderAll();
}

async function seedDefaultCategories() {
    const defaults = [
        { name: 'Food', color: '#F97316', budget_monthly: 8000, icon: 'fa-solid fa-utensils' },
        { name: 'Transport', color: '#0EA5E9', budget_monthly: 5000, icon: 'fa-solid fa-bus' },
        { name: 'Bills', color: '#8B5CF6', budget_monthly: 7000, icon: 'fa-solid fa-file-invoice' },
        { name: 'Shopping', color: '#EC4899', budget_monthly: 6000, icon: 'fa-solid fa-bag-shopping' }
    ];

    await Promise.all(defaults.map((category) => api.create('categories', category)));
    toast('Default categories added. You can edit/delete them anytime.', 'success');
}

function renderAll() {
    markAnomalies();
    renderCategorySelectors();
    renderExpensesTable();
    renderCategoryList(handleCategoryEdit, handleCategoryDelete);
    renderRecurring();
    renderMetrics();
    renderBudgets();
    renderCharts();
    renderRecurringDeleteHooks();
    document.getElementById('currency-select').value = store.state.settings.currency || 'USD';
    document.getElementById('overall-budget-input').value = store.state.settings.monthly_budget_limit || '';
}

function markAnomalies() {
    const anomalies = new Set(detectAnomalies(store.state.expenses));
    store.state.expenses.forEach((x) => { x.is_anomaly = anomalies.has(x.id); });
}

function renderMetrics() {
    const { total, monthTotal } = computeMetrics();
    const { prediction, confidence } = predictNextMonth(store.state.expenses);
    const overall = Number(store.state.settings.monthly_budget_limit || 0);

    document.getElementById('total-expenses').textContent = formatCurrency(total);
    document.getElementById('month-expenses').textContent = formatCurrency(monthTotal);
    document.getElementById('forecast-value').textContent = `~${formatCurrency(prediction)}`;
    document.getElementById('forecast-confidence').textContent = `Confidence: ${(confidence * 100).toFixed(0)}%`;
    document.getElementById('overall-budget-status').textContent = `${formatCurrency(monthTotal)} / ${formatCurrency(overall)}`;
    if (overall > 0 && monthTotal > overall) toast('Overall monthly budget exceeded', 'error');
}

function renderBudgets() {
    const wrap = document.getElementById('budget-progress');
    const monthPrefix = new Date().toISOString().slice(0, 7);
    const byCategory = new Map();
    store.state.expenses
        .filter((e) => e.date.startsWith(monthPrefix))
        .forEach((e) => byCategory.set(String(e.category_id), (byCategory.get(String(e.category_id)) || 0) + Number(e.amount)));

    wrap.innerHTML = store.state.categories.map((cat) => {
        const spent = byCategory.get(String(cat.id)) || 0;
        const budget = Number(cat.budget_monthly || 0);
        const pct = budget ? Math.min(100, (spent / budget) * 100) : 0;
        let status = 'ok';
        if (budget > 0 && spent >= budget) status = 'danger';
        else if (budget > 0 && spent >= budget * 0.8) status = 'warn';

        if (status === 'warn') toast(`${cat.name}: nearing budget`, 'warning');
        if (status === 'danger') toast(`${cat.name}: budget exceeded`, 'error');

        return `<div class="budget-card">
            <h4>${cat.name}</h4>
            <p>${formatCurrency(spent)} / ${formatCurrency(budget)}</p>
            <div class="progress"><div class="progress-bar ${status}" style="width:${pct}%"></div></div>
        </div>`;
    }).join('') || 'No categories configured.';
}

function renderCharts() {
    const colorFor = (id) => store.state.categories.find((c) => String(c.id) === String(id))?.color || '#5A67D8';
    const categoryMap = new Map();
    store.state.expenses.forEach((e) => categoryMap.set(String(e.category_id), (categoryMap.get(String(e.category_id)) || 0) + Number(e.amount)));

    const pieLabels = [...categoryMap.keys()].map((id) => store.state.categories.find((c) => String(c.id) === id)?.name || 'Unknown');
    const pieData = [...categoryMap.values()];
    const pieColors = [...categoryMap.keys()].map((id) => colorFor(id));

    const monthly = lastSixMonthSeries(store.state.expenses);
    const cumulative = cumulativeSeries(store.state.expenses);

    drawChart('pie', 'pie-chart', { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: pieColors }] });
    drawChart('bar', 'bar-chart', { labels: monthly.labels, datasets: [{ label: 'Monthly spend', data: monthly.values, backgroundColor: '#4C51BF' }] });
    drawChart('line', 'line-chart', { labels: cumulative.labels, datasets: [{ label: 'Cumulative spend', data: cumulative.values, borderColor: '#00A3C4', tension: 0.3 }] });
}

function drawChart(type, canvasId, data) {
    if (store.state.charts[canvasId]) store.state.charts[canvasId].destroy();
    const ctx = document.getElementById(canvasId);
    store.state.charts[canvasId] = new Chart(ctx, { type, data, options: { responsive: true, maintainAspectRatio: false } });
}

function lastSixMonthSeries(expenses) {
    const now = new Date();
    const labels = [];
    const values = [];
    for (let i = 5; i >= 0; i -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        labels.push(key);
        values.push(expenses.filter((e) => e.date.startsWith(key)).reduce((s, e) => s + Number(e.amount), 0));
    }
    return { labels, values };
}

function cumulativeSeries(expenses) {
    const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const labels = [];
    const values = [];
    sorted.forEach((e) => {
        running += Number(e.amount);
        labels.push(e.date);
        values.push(running);
    });
    return { labels, values };
}

function bindStaticEvents() {
    document.getElementById('expense-form').addEventListener('submit', onExpenseSubmit);
    document.getElementById('category-form').addEventListener('submit', onCategorySubmit);
    document.getElementById('theme-toggle').addEventListener('click', onThemeToggle);
    document.getElementById('currency-select').addEventListener('change', onCurrencyChange);
    document.getElementById('overall-budget-form').addEventListener('submit', onOverallBudgetSave);
    document.getElementById('apply-filter').addEventListener('click', onApplyFilters);
    document.getElementById('clear-filter').addEventListener('click', onClearFilters);
    document.getElementById('export-csv').addEventListener('click', () => exportCsv(filteredExpenses()));
    document.getElementById('export-pdf').addEventListener('click', () => exportPdf(filteredExpenses()));
    document.getElementById('backup-json').addEventListener('click', backupJson);
    document.getElementById('restore-json').addEventListener('change', onRestoreJson);
    document.querySelectorAll('#expense-table th[data-sort]').forEach((head) => {
        head.addEventListener('click', () => onSort(head.dataset.sort));
    });
    document.getElementById('expense-table-body').addEventListener('click', onTableAction);
    document.getElementById('expense-date').valueAsDate = new Date();
}

async function onExpenseSubmit(event) {
    event.preventDefault();
    const recurring = document.getElementById('expense-recurring').checked;
    const payload = {
        name: document.getElementById('expense-name').value.trim(),
        amount: Number(document.getElementById('expense-amount').value),
        category_id: Number(document.getElementById('expense-category').value),
        date: document.getElementById('expense-date').value,
        notes: document.getElementById('expense-notes').value.trim(),
        tags: document.getElementById('expense-tags').value.split(',').map((x) => x.trim()).filter(Boolean),
        is_recurring: recurring,
        recurring_period: recurring ? document.getElementById('expense-recurring-period').value : null
    };
    await api.create('expenses', payload);
    if (recurring) {
        await api.create('recurring', {
            name: payload.name, amount: payload.amount, category_id: payload.category_id,
            period: payload.recurring_period, next_date: payload.date
        });
    }
    event.target.reset();
    document.getElementById('expense-date').valueAsDate = new Date();
    toast('Expense saved', 'success');
    await refreshState();
}

async function onCategorySubmit(event) {
    event.preventDefault();
    const payload = {
        name: document.getElementById('category-name').value.trim(),
        color: document.getElementById('category-color').value,
        budget_monthly: Number(document.getElementById('category-budget').value || 0),
        icon: 'fa-solid fa-tag'
    };
    await api.create('categories', payload);
    event.target.reset();
    toast('Category created', 'success');
    await refreshState();
}

async function onTableAction(event) {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'delete') {
        await api.remove('expenses', id);
        toast('Expense deleted', 'success');
        await refreshState();
        return;
    }
    const item = store.state.expenses.find((x) => String(x.id) === String(id));
    if (!item) return;
    const amount = window.prompt('Update amount', item.amount);
    if (amount === null) return;
    await api.update('expenses', id, { amount: Number(amount) });
    toast('Expense updated', 'success');
    await refreshState();
}

async function handleCategoryDelete(id) {
    if (!window.confirm('Delete category?')) return;
    await api.remove('categories', id);
    toast('Category deleted', 'success');
    await refreshState();
}

async function handleCategoryEdit(id) {
    const current = store.state.categories.find((c) => String(c.id) === String(id));
    if (!current) return;
    const nextBudget = window.prompt('New monthly budget', String(current.budget_monthly || 0));
    if (nextBudget === null) return;
    await api.update('categories', id, { budget_monthly: Number(nextBudget) });
    toast('Category updated', 'success');
    await refreshState();
}

function onApplyFilters() {
    store.state.filters = {
        search: document.getElementById('search-input').value.trim(),
        category: document.getElementById('filter-category').value,
        from: document.getElementById('filter-from').value,
        to: document.getElementById('filter-to').value
    };
    renderExpensesTable();
}

function onClearFilters() {
    store.state.filters = { search: '', category: '', from: '', to: '' };
    document.getElementById('search-input').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-from').value = '';
    document.getElementById('filter-to').value = '';
    renderExpensesTable();
}

function onSort(key) {
    const current = store.state.sort;
    store.state.sort = {
        key,
        direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    };
    renderExpensesTable();
}

async function onThemeToggle() {
    const next = store.state.settings.theme === 'dark' ? 'light' : 'dark';
    await api.update('settings', '', { theme: next });
    await refreshState();
}

async function onCurrencyChange(event) {
    await api.update('settings', '', { currency: event.target.value });
    await refreshState();
}

async function onOverallBudgetSave(event) {
    event.preventDefault();
    const budget = Number(document.getElementById('overall-budget-input').value || 0);
    await api.update('settings', '', { monthly_budget_limit: budget });
    toast('Overall budget updated', 'success');
    await refreshState();
}

async function onRestoreJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    await restoreJson(file);
    toast('Backup restored', 'success');
    await refreshState();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', store.state.settings.theme || 'light');
}

function renderRecurringDeleteHooks() {
    document.querySelectorAll('[data-rec-delete]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            await api.remove('recurring', btn.dataset.recDelete);
            toast('Recurring item deleted', 'success');
            await refreshState();
        });
    });
}

async function runRecurringGeneration() {
    try {
        const res = await fetch('backend.php?entity=recurring-run', { method: 'POST' });
        const payload = await res.json();
        if (payload?.data?.created?.length) {
            toast(`${payload.data.created.length} recurring expenses auto-added`, 'success');
        }
    } catch (error) {
        console.error(error);
    }
}

boot().catch((error) => {
    console.error(error);
    toast(`Initialization failed: ${error.message}`, 'error');
});
