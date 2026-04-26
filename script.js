const API = 'backend.php';

export const store = {
    state: {
        expenses: [],
        categories: [],
        recurring: [],
        settings: { currency: 'USD', theme: 'light', default_view: 'dashboard', monthly_budget_limit: 0 },
        filters: { search: '', category: '', from: '', to: '' },
        sort: { key: 'date', direction: 'desc' },
        charts: {}
    },
    set(partial) {
        this.state = { ...this.state, ...partial };
    }
};

export const api = {
    async request(entity, method = 'GET', body = null, id = '') {
        const url = `${API}?entity=${encodeURIComponent(entity)}${id ? `&id=${id}` : ''}`;
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : null
        });
        const payload = await res.json();
        if (!res.ok || payload.success === false) {
            throw new Error(payload.message || 'API request failed');
        }
        return payload.data;
    },
    getAll(entity) { return this.request(entity); },
    create(entity, payload) { return this.request(entity, 'POST', payload); },
    update(entity, id, payload) { return this.request(entity, 'PUT', payload, id); },
    remove(entity, id) { return this.request(entity, 'DELETE', null, id); }
};

const currencyMap = { USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', INR: 'en-IN' };
export function formatCurrency(value) {
    const code = store.state.settings.currency || 'USD';
    return new Intl.NumberFormat(currencyMap[code] || 'en-US', { style: 'currency', currency: code }).format(Number(value || 0));
}

export function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const node = document.createElement('div');
    node.className = `toast ${type}`;
    node.textContent = message;
    container.appendChild(node);
    requestAnimationFrame(() => node.classList.add('show'));
    setTimeout(() => {
        node.classList.remove('show');
        setTimeout(() => node.remove(), 250);
    }, 2800);
}

function getCategory(categoryId) {
    return store.state.categories.find((c) => String(c.id) === String(categoryId));
}

export function filteredExpenses() {
    const { search, category, from, to } = store.state.filters;
    let items = [...store.state.expenses];
    if (search) {
        const key = search.toLowerCase();
        items = items.filter((x) => [x.name, x.notes, (x.tags || []).join(',')].join(' ').toLowerCase().includes(key));
    }
    if (category) items = items.filter((x) => String(x.category_id) === String(category));
    if (from) items = items.filter((x) => x.date >= from);
    if (to) items = items.filter((x) => x.date <= to);

    const { key, direction } = store.state.sort;
    items.sort((a, b) => {
        const factor = direction === 'asc' ? 1 : -1;
        if (key === 'category') return ((getCategory(a.category_id)?.name || '').localeCompare(getCategory(b.category_id)?.name || '')) * factor;
        if (key === 'amount') return (Number(a.amount) - Number(b.amount)) * factor;
        return String(a[key] || '').localeCompare(String(b[key] || '')) * factor;
    });
    return items;
}

export function computeMetrics() {
    const expenses = store.state.expenses;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const total = expenses.reduce((sum, x) => sum + Number(x.amount), 0);
    const monthTotal = expenses.filter((x) => x.date.startsWith(monthKey)).reduce((sum, x) => sum + Number(x.amount), 0);
    return { total, monthTotal };
}

function rowTemplate(expense) {
    const category = getCategory(expense.category_id);
    const icon = category ? `<i class="fa-solid fa-circle" style="color:${category.color}"></i> ${category.name}` : 'Uncategorized';
    const tags = (expense.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join('');
    const anomalyClass = expense.is_anomaly ? 'anomaly' : '';
    return `<tr class="${anomalyClass}">
        <td>${expense.name}</td>
        <td>${formatCurrency(expense.amount)}</td>
        <td>${icon}</td>
        <td>${expense.date}</td>
        <td>${tags}</td>
        <td>${expense.notes || ''}</td>
        <td>
            <button class="table-btn" data-action="edit" data-id="${expense.id}"><i class="fa-solid fa-pen"></i></button>
            <button class="table-btn danger" data-action="delete" data-id="${expense.id}"><i class="fa-solid fa-trash"></i></button>
        </td>
    </tr>`;
}

export function renderExpensesTable() {
    const tbody = document.getElementById('expense-table-body');
    tbody.innerHTML = filteredExpenses().map(rowTemplate).join('') || '<tr><td colspan="7">No expenses found</td></tr>';
}

export function renderCategorySelectors() {
    const options = ['<option value="">Select category</option>']
        .concat(store.state.categories.map((c) => `<option value="${c.id}">${c.name}</option>`))
        .join('');
    document.getElementById('expense-category').innerHTML = options;
    document.getElementById('filter-category').innerHTML = `<option value="">All categories</option>${options}`;
}

export function renderCategoryList(onEdit, onDelete) {
    const container = document.getElementById('category-list');
    container.innerHTML = store.state.categories.map((c) => `
        <div class="chip">
            <span><i class="fa-solid fa-circle" style="color:${c.color}"></i> ${c.name} (${formatCurrency(c.budget_monthly || 0)})</span>
            <div>
                <button data-cat-edit="${c.id}" class="table-btn"><i class="fa-solid fa-pen"></i></button>
                <button data-cat-delete="${c.id}" class="table-btn danger"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`).join('');
    container.querySelectorAll('[data-cat-edit]').forEach((b) => b.addEventListener('click', () => onEdit(b.dataset.catEdit)));
    container.querySelectorAll('[data-cat-delete]').forEach((b) => b.addEventListener('click', () => onDelete(b.dataset.catDelete)));
}

export function renderRecurring() {
    const container = document.getElementById('recurring-list');
    container.innerHTML = store.state.recurring.map((r) => `
        <div class="recurring-item">
            <strong>${r.name}</strong>
            <span>${formatCurrency(r.amount)} | ${r.period} | next: ${r.next_date}</span>
            <button data-rec-delete="${r.id}" class="table-btn danger"><i class="fa-solid fa-trash"></i></button>
        </div>`).join('') || 'No recurring expenses configured.';
}

export function exportCsv(items) {
    const header = ['id', 'name', 'amount', 'category_id', 'date', 'notes', 'tags'].join(',');
    const body = items.map((x) => [
        x.id,
        `"${(x.name || '').replace(/"/g, '""')}"`,
        x.amount,
        x.category_id,
        x.date,
        `"${(x.notes || '').replace(/"/g, '""')}"`,
        `"${(x.tags || []).join('|')}"`
    ].join(',')).join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

export function exportPdf(items) {
    const popup = window.open('', '_blank');
    const rows = items.map((x) => `<tr><td>${x.name}</td><td>${formatCurrency(x.amount)}</td><td>${x.date}</td><td>${x.notes || ''}</td></tr>`).join('');
    popup.document.write(`<html><head><title>Expense Report</title></head><body>
        <h2>Expense Report</h2><table border="1" cellpadding="6" cellspacing="0"><tr><th>Name</th><th>Amount</th><th>Date</th><th>Notes</th></tr>${rows}</table>
        </body></html>`);
    popup.document.close();
    popup.print();
}

export function backupJson() {
    const snapshot = JSON.stringify({
        categories: store.state.categories,
        expenses: store.state.expenses,
        recurring: store.state.recurring,
        settings: store.state.settings
    }, null, 2);
    const blob = new Blob([snapshot], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `expense-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
}

export async function restoreJson(file) {
    const text = await file.text();
    const payload = JSON.parse(text);
    const entities = ['categories', 'expenses', 'recurring'];
    for (const entity of entities) {
        const current = await api.getAll(entity);
        await Promise.all(current.map((item) => api.remove(entity, item.id)));
        for (const item of payload[entity] || []) {
            const copy = { ...item };
            delete copy.id;
            await api.create(entity, copy);
        }
    }
    await api.update('settings', '', payload.settings || {});
}