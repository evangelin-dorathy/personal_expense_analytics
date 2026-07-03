// State management
let state = {
    budget: 20000,
    currentPage: 1,
    perPage: 10,
    sortBy: 'Date',
    sortOrder: 'desc',
    search: '',
    categoryFilter: 'All',
    typeFilter: 'All',
    charts: {} // Store Chart.js instances
};

// DOM Elements
const elements = {
    totalIncome: document.getElementById('kpi-total-income'),
    totalExpense: document.getElementById('kpi-total-expense'),
    totalSavings: document.getElementById('kpi-total-savings'),
    topCategory: document.getElementById('kpi-top-category'),
    topCategoryAmount: document.getElementById('kpi-top-category-amount'),
    paymentMethod: document.getElementById('kpi-payment-method'),
    paymentMethodCount: document.getElementById('kpi-payment-method-count'),
    
    // Budget
    budgetAmount: document.getElementById('budget-amount'),
    budgetSpent: document.getElementById('budget-spent'),
    budgetRemaining: document.getElementById('budget-remaining'),
    budgetProgress: document.getElementById('budget-progress'),
    budgetAlert: document.getElementById('budget-alert'),
    editBudgetBtn: document.getElementById('edit-budget-btn'),
    budgetModal: document.getElementById('budget-modal'),
    closeBudgetModal: document.getElementById('close-budget-modal-btn'),
    cancelBudgetModal: document.getElementById('cancel-budget-modal-btn'),
    editBudgetForm: document.getElementById('edit-budget-form'),
    budgetInput: document.getElementById('budget-input'),
    

    
    // Transactions Table
    txnTableBody: document.getElementById('txn-table-body'),
    txnSearch: document.getElementById('txn-search'),
    txnFilterCategory: document.getElementById('txn-filter-category'),
    txnFilterType: document.getElementById('txn-filter-type'),
    
    // Pagination
    pagStart: document.getElementById('pag-start'),
    pagEnd: document.getElementById('pag-end'),
    pagTotal: document.getElementById('pag-total'),
    currentPageIndicator: document.getElementById('current-page'),
    totalPagesIndicator: document.getElementById('total-pages'),
    prevPageBtn: document.getElementById('prev-page-btn'),
    nextPageBtn: document.getElementById('next-page-btn')
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Load budget from LocalStorage if it exists
    const storedBudget = localStorage.getItem('monthly_budget');
    if (storedBudget) {
        state.budget = parseFloat(storedBudget);
    }
    elements.budgetAmount.textContent = formatCurrency(state.budget);
    elements.budgetInput.value = state.budget;

    // Attach Event Listeners
    setupEventListeners();

    // Fetch and Load Data
    refreshDashboard();
});

// Setup Event Listeners
function setupEventListeners() {


    // Edit Budget Events
    elements.editBudgetBtn.addEventListener('click', () => {
        elements.budgetInput.value = state.budget;
        elements.budgetModal.classList.add('active');
    });
    elements.closeBudgetModal.addEventListener('click', () => elements.budgetModal.classList.remove('active'));
    elements.cancelBudgetModal.addEventListener('click', () => elements.budgetModal.classList.remove('active'));
    elements.editBudgetForm.addEventListener('submit', handleUpdateBudget);

    // Table Filters and Searches
    elements.txnSearch.addEventListener('input', debounce((e) => {
        state.search = e.target.value;
        state.currentPage = 1;
        fetchTransactions();
    }, 300));

    elements.txnFilterCategory.addEventListener('change', (e) => {
        state.categoryFilter = e.target.value;
        state.currentPage = 1;
        fetchTransactions();
    });

    elements.txnFilterType.addEventListener('change', (e) => {
        state.typeFilter = e.target.value;
        state.currentPage = 1;
        fetchTransactions();
    });

    // Pagination
    elements.prevPageBtn.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            fetchTransactions();
        }
    });

    elements.nextPageBtn.addEventListener('click', () => {
        state.currentPage++;
        fetchTransactions();
    });

    // Sorting columns
    document.querySelectorAll('.txn-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortField = th.dataset.sort;
            if (state.sortBy === sortField) {
                state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortBy = sortField;
                state.sortOrder = 'desc';
            }
            
            // Update sort icons
            document.querySelectorAll('.txn-table th.sortable i').forEach(icon => {
                icon.className = 'fa-solid fa-sort';
            });
            const activeIcon = th.querySelector('i');
            activeIcon.className = `fa-solid fa-sort-${state.sortOrder === 'asc' ? 'up' : 'down'}`;
            
            fetchTransactions();
        });
    });
}

// Refresh all sections of the dashboard
function refreshDashboard() {
    fetchSummary();
    fetchCategoryData();
    fetchMonthlyTrends();
    fetchWeeklyTrends();
    fetchPaymentMethods();
    fetchDailyTrends();
    fetchTransactions();
}

// Fetch general KPI metrics and update UI
async function fetchSummary() {
    try {
        const response = await fetch('/api/summary');
        const data = await response.json();
        
        elements.totalIncome.textContent = formatCurrency(data.total_income);
        elements.totalExpense.textContent = formatCurrency(data.total_expense);
        elements.totalSavings.textContent = formatCurrency(data.total_savings);
        
        // Savings visual cue
        if (data.total_savings < 0) {
            elements.totalSavings.className = 'kpi-value amount-expense';
        } else {
            elements.totalSavings.className = 'kpi-value amount-income';
        }
        
        elements.topCategory.textContent = data.top_category;
        elements.topCategoryAmount.textContent = formatCurrency(data.top_category_amount);
        elements.paymentMethod.textContent = data.most_frequent_payment_method;
        elements.paymentMethodCount.textContent = `${data.most_frequent_payment_method_count} transactions`;
    } catch (err) {
        console.error('Error fetching summary:', err);
    }
}

// Fetch spending by categories and render chart
async function fetchCategoryData() {
    try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        
        const labels = Object.keys(data.mapped);
        const values = Object.values(data.mapped);
        
        // Setup budget values using the last month's spending as active budget spent
        // Let's get the active budget spent dynamically from monthly trends
        
        renderCategoryChart(labels, values);
    } catch (err) {
        console.error('Error fetching categories:', err);
    }
}

// Fetch Monthly Income, Expense & Savings trends
async function fetchMonthlyTrends() {
    try {
        const response = await fetch('/api/monthly');
        const data = await response.json();
        
        // Render Grouped Bar Chart
        renderMonthlyChart(data.labels, data.income, data.expense, data.savings);
        
        // Calculate budget tracking metrics
        // We track budget for the most recent month in the monthly dataset
        if (data.expense.length > 0) {
            const latestSpent = data.expense[data.expense.length - 1];
            const latestMonthName = data.labels[data.labels.length - 1];
            
            updateBudgetProgress(latestSpent, latestMonthName);
        }
    } catch (err) {
        console.error('Error fetching monthly trends:', err);
    }
}

// Update the Budget Tracking Card Progress
function updateBudgetProgress(spent, monthName) {
    elements.budgetSpent.textContent = formatCurrency(spent);
    const remaining = state.budget - spent;
    elements.budgetRemaining.textContent = formatCurrency(remaining);
    
    // Percentage
    let pct = (spent / state.budget) * 100;
    pct = Math.min(100, Math.max(0, pct));
    elements.budgetProgress.style.width = `${pct}%`;
    
    if (spent > state.budget) {
        elements.budgetProgress.classList.add('danger');
        elements.budgetAlert.style.display = 'flex';
        elements.budgetRemaining.className = 'amount-expense';
    } else {
        elements.budgetProgress.classList.remove('danger');
        elements.budgetAlert.style.display = 'none';
        elements.budgetRemaining.className = 'amount-income';
    }
    
    // Update sidebar card title
    document.querySelector('.budget-card h3').textContent = `Budget: ${monthName}`;
}

// Fetch weekly spending line chart
async function fetchWeeklyTrends() {
    try {
        const response = await fetch('/api/weekly');
        const data = await response.json();
        renderWeeklyChart(data.labels, data.values);
    } catch (err) {
        console.error('Error fetching weekly trends:', err);
    }
}

// Fetch payment methods statistics
async function fetchPaymentMethods() {
    try {
        const response = await fetch('/api/payment-methods');
        const data = await response.json();
        
        const labels = Object.keys(data.amounts);
        const values = Object.values(data.amounts);
        renderPaymentMethodChart(labels, values);
    } catch (err) {
        console.error('Error fetching payment methods:', err);
    }
}

// Fetch daily spending trends
async function fetchDailyTrends() {
    try {
        const response = await fetch('/api/daily-trends');
        const data = await response.json();
        renderDailyChart(data.days.labels, data.days.values);
    } catch (err) {
        console.error('Error fetching daily trends:', err);
    }
}

// Fetch transactions table data
async function fetchTransactions() {
    try {
        const url = `/api/transactions?search=${encodeURIComponent(state.search)}&category=${state.categoryFilter}&type=${state.typeFilter}&sortBy=${state.sortBy}&sortOrder=${state.sortOrder}&page=${state.currentPage}&perPage=${state.perPage}`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Populate Table Body
        elements.txnTableBody.innerHTML = '';
        if (data.transactions.length === 0) {
            elements.txnTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;"><i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i> No transactions found</td></tr>`;
        } else {
            data.transactions.forEach(t => {
                const tr = document.createElement('tr');
                
                const badgeClass = t.type.toLowerCase() === 'income' ? 'income' : 'expense';
                const amtClass = t.type.toLowerCase() === 'income' ? 'amount-income' : 'amount-expense';
                const prefix = t.type.toLowerCase() === 'income' ? '+' : '-';
                
                tr.innerHTML = `
                    <td>${t.date}</td>
                    <td><span class="badge ${badgeClass}">${t.type}</span></td>
                    <td><strong>${t.mapped_category}</strong></td>
                    <td style="color: var(--text-secondary); font-size: 0.85rem;">${t.raw_category || 'N/A'}</td>
                    <td><i class="fa-solid ${getPaymentIcon(t.payment_method)}"></i> ${t.payment_method}</td>
                    <td title="${t.note}">${t.note}</td>
                    <td class="text-right ${amtClass}">${prefix} ${formatCurrency(t.amount)}</td>
                `;
                elements.txnTableBody.appendChild(tr);
            });
        }
        
        // Update pagination UI
        const pag = data.pagination;
        state.currentPage = pag.page;
        
        elements.currentPageIndicator.textContent = pag.page;
        elements.totalPagesIndicator.textContent = pag.total_pages;
        
        const startNum = pag.total_records === 0 ? 0 : (pag.page - 1) * pag.per_page + 1;
        const endNum = Math.min(pag.total_records, pag.page * pag.per_page);
        
        elements.pagStart.textContent = startNum;
        elements.pagEnd.textContent = endNum;
        elements.pagTotal.textContent = pag.total_records;
        
        // Disable buttons if bounds reached
        elements.prevPageBtn.disabled = pag.page <= 1;
        elements.nextPageBtn.disabled = pag.page >= pag.total_pages;
    } catch (err) {
        console.error('Error fetching transactions:', err);
    }
}



// Update budget form submit handler
function handleUpdateBudget(e) {
    e.preventDefault();
    const budgetVal = parseFloat(elements.budgetInput.value);
    if (isNaN(budgetVal) || budgetVal < 1000) {
        alert('Please enter a valid budget amount (minimum ₹1,000).');
        return;
    }
    
    state.budget = budgetVal;
    localStorage.setItem('monthly_budget', budgetVal.toString());
    elements.budgetAmount.textContent = formatCurrency(budgetVal);
    elements.budgetModal.classList.remove('active');
    
    // Refresh dashboard to recalculate progress bar with new budget
    refreshDashboard();
}

/* --- Helper functions --- */

function formatCurrency(num) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(num);
}

function getPaymentIcon(method) {
    switch (method) {
        case 'Cash': return 'fa-money-bill-1';
        case 'UPI': return 'fa-mobile-screen-button';
        case 'Credit Card': return 'fa-credit-card';
        case 'Debit Card': return 'fa-building-columns';
        default: return 'fa-wallet';
    }
}

// Debounce input searches
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


/* --- CHART RENDERING (CHART.JS) --- */

function destroyChart(name) {
    if (state.charts[name]) {
        state.charts[name].destroy();
        delete state.charts[name];
    }
}

// 1. Spending by Category (Donut Chart)
function renderCategoryChart(labels, values) {
    destroyChart('category');
    
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    // Beautiful color palette for categories
    const colors = [
        '#ef4444', // Food (Red)
        '#f59e0b', // Shopping (Amber)
        '#3b82f6', // Transport (Blue)
        '#ec4899', // Entertainment (Pink)
        '#7c3aed', // Bills (Purple)
        '#10b981', // Healthcare (Emerald)
        '#6b7280'  // Other (Gray)
    ];

    state.charts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#161823',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#9ca3af',
                        font: { family: 'Plus Jakarta Sans', size: 11 },
                        padding: 15,
                        boxWidth: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            label += formatCurrency(context.parsed);
                            return label;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// 2. Monthly Income vs Expenses vs Savings (Grouped Bar Chart)
function renderMonthlyChart(labels, income, expense, savings) {
    destroyChart('monthly');
    
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    state.charts.monthly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: income,
                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                    borderColor: '#10b981',
                    borderWidth: 1.5,
                    borderRadius: 6
                },
                {
                    label: 'Expense',
                    data: expense,
                    backgroundColor: 'rgba(239, 68, 68, 0.75)',
                    borderColor: '#ef4444',
                    borderWidth: 1.5,
                    borderRadius: 6
                },
                {
                    label: 'Savings',
                    data: savings,
                    type: 'line',
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.15)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.35,
                    pointBackgroundColor: '#06b6d4'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#9ca3af',
                        font: { family: 'Plus Jakarta Sans', size: 11 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            label += formatCurrency(context.parsed.y);
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: {
                        color: '#9ca3af',
                        font: { family: 'Plus Jakarta Sans' },
                        callback: function(value) { return '₹' + value.toLocaleString('en-IN'); }
                    }
                }
            }
        }
    });
}

// 3. Weekly Spending Trend (Line Chart)
function renderWeeklyChart(labels, values) {
    destroyChart('weekly');
    
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    
    state.charts.weekly = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Spending',
                data: values,
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.08)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#7c3aed',
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Spent: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans', size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: {
                        color: '#9ca3af',
                        font: { family: 'Plus Jakarta Sans' },
                        callback: function(value) { return '₹' + value; }
                    }
                }
            }
        }
    });
}

// 4. Payment Method Amounts spent (Bar Chart)
function renderPaymentMethodChart(labels, values) {
    destroyChart('paymentMethod');
    
    const ctx = document.getElementById('paymentMethodChart').getContext('2d');
    
    state.charts.paymentMethod = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    'rgba(245, 158, 11, 0.75)', // Cash
                    'rgba(59, 130, 246, 0.75)',  // UPI
                    'rgba(236, 72, 153, 0.75)',  // Credit Card
                    'rgba(16, 185, 129, 0.75)'   // Debit Card
                ],
                borderColor: [
                    '#f59e0b',
                    '#3b82f6',
                    '#ec4899',
                    '#10b981'
                ],
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Total: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: {
                        color: '#9ca3af',
                        font: { family: 'Plus Jakarta Sans' },
                        callback: function(value) { return '₹' + value.toLocaleString('en-IN'); }
                    }
                }
            }
        }
    });
}

// 5. Daily Spending Trends (Bar Chart)
function renderDailyChart(labels, values) {
    destroyChart('daily');
    
    const ctx = document.getElementById('dailyChart').getContext('2d');
    
    state.charts.daily = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: 'rgba(6, 182, 212, 0.75)',
                borderColor: '#06b6d4',
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Spent: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: {
                        color: '#9ca3af',
                        font: { family: 'Plus Jakarta Sans' },
                        callback: function(value) { return '₹' + value.toLocaleString('en-IN'); }
                    }
                }
            }
        }
    });
}
