import os
import pandas as pd
import numpy as np
from flask import Flask, jsonify, request, render_template, send_from_directory

app = Flask(__name__, template_folder='templates', static_folder='static')

CSV_PATH = r"C:\Users\User\Downloads\expense\expense_data_1.csv"

def load_data():
    if not os.path.exists(CSV_PATH):
        # Return empty DataFrame with appropriate columns if file does not exist
        return pd.DataFrame(columns=['Date', 'Account', 'Category', 'Subcategory', 'Note', 'INR', 'Income/Expense', 'Amount', 'Currency'])
    
    df = pd.read_csv(CSV_PATH)
    
    # Standardize columns to handle duplicates or pandas indexing (like Note.1, Account.1)
    # The columns we care about: Date, Account, Category, Note, Income/Expense, Amount, Currency
    # If pandas created Account.1 or Note.1, we clean them up.
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
    
    # Fill missing values
    df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
    df['Amount'] = pd.to_numeric(df['Amount'], errors='coerce').fillna(0.0)
    df['Income/Expense'] = df['Income/Expense'].fillna('Expense')
    df['Category'] = df['Category'].fillna('Other')
    df['Account'] = df['Account'].fillna('UPI')
    df['Note'] = df['Note'].fillna('')
    df['Currency'] = df['Currency'].fillna('INR')
    
    # Sort by date descending by default
    df = df.sort_values('Date', ascending=False)
    return df

def save_data(df):
    # Ensure directory exists
    os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
    # Write back to CSV matching the original format structure as closely as possible
    # original header: Date,Account,Category,Subcategory,Note,INR,Income/Expense,Note.1,Amount,Currency,Account.1
    # We will write standard columns.
    df.to_csv(CSV_PATH, index=False)

def map_category(raw_cat):
    if not isinstance(raw_cat, str):
        return 'Other'
    raw_cat_lower = raw_cat.strip().lower()
    if raw_cat_lower == 'food':
        return 'Food'
    elif raw_cat_lower in ['apparel', 'beauty', 'gift', 'shopping']:
        return 'Shopping'
    elif raw_cat_lower in ['transportation', 'transport']:
        return 'Transport'
    elif raw_cat_lower in ['social life', 'entertainment']:
        return 'Entertainment'
    elif raw_cat_lower in ['household', 'education', 'self-development', 'bills']:
        return 'Bills'
    elif raw_cat_lower == 'healthcare':
        return 'Healthcare'
    else:
        return 'Other'

def map_payment_method(account):
    if not isinstance(account, str):
        return 'UPI'
    account_lower = account.strip().lower()
    if 'cash' in account_lower:
        return 'Cash'
    elif 'credit' in account_lower:
        return 'Credit Card'
    elif 'debit' in account_lower:
        return 'Debit Card'
    else:
        # Default CUB - online payment or others to UPI as UPI is the primary online payment method
        return 'UPI'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/summary')
def get_summary():
    df = load_data()
    # Filter valid rows
    df = df[df['Date'].notna()]
    
    # Calculate Income and Expense
    df_expense = df[df['Income/Expense'] == 'Expense']
    df_income = df[df['Income/Expense'] == 'Income']
    
    total_expense = float(df_expense['Amount'].sum())
    total_income = float(df_income['Amount'].sum())
    total_savings = total_income - total_expense
    
    # Find category that consumes the most money
    if not df_expense.empty:
        df_expense_mapped = df_expense.copy()
        df_expense_mapped['MappedCategory'] = df_expense_mapped['Category'].apply(map_category)
        cat_spending = df_expense_mapped.groupby('MappedCategory')['Amount'].sum()
        if not cat_spending.empty:
            top_category = cat_spending.idxmax()
            top_category_amount = float(cat_spending.max())
        else:
            top_category = 'N/A'
            top_category_amount = 0.0
    else:
        top_category = 'N/A'
        top_category_amount = 0.0
        
    # Find most frequent payment method (based on all transactions)
    if not df.empty:
        df_mapped = df.copy()
        df_mapped['PaymentMethod'] = df_mapped['Account'].apply(map_payment_method)
        payment_counts = df_mapped['PaymentMethod'].value_counts()
        if not payment_counts.empty:
            most_frequent_pm = payment_counts.idxmax()
            most_frequent_pm_count = int(payment_counts.max())
        else:
            most_frequent_pm = 'UPI'
            most_frequent_pm_count = 0
    else:
        most_frequent_pm = 'UPI'
        most_frequent_pm_count = 0
        
    # Find highest/lowest spending months
    if not df_expense.empty:
        df_m = df_expense.copy()
        df_m['MonthStr'] = df_m['Date'].dt.strftime('%B %Y')
        monthly_totals = df_m.groupby('MonthStr')['Amount'].sum()
        if not monthly_totals.empty:
            highest_month = monthly_totals.idxmax()
            highest_month_amount = float(monthly_totals.max())
            lowest_month = monthly_totals.idxmin()
            lowest_month_amount = float(monthly_totals.min())
        else:
            highest_month = 'N/A'
            highest_month_amount = 0.0
            lowest_month = 'N/A'
            lowest_month_amount = 0.0
    else:
        highest_month = 'N/A'
        highest_month_amount = 0.0
        lowest_month = 'N/A'
        lowest_month_amount = 0.0
        
    return jsonify({
        'total_income': total_income,
        'total_expense': total_expense,
        'total_savings': total_savings,
        'top_category': top_category,
        'top_category_amount': top_category_amount,
        'most_frequent_payment_method': most_frequent_pm,
        'most_frequent_payment_method_count': most_frequent_pm_count,
        'highest_spending_month': highest_month,
        'highest_spending_month_amount': highest_month_amount,
        'lowest_spending_month': lowest_month,
        'lowest_spending_month_amount': lowest_month_amount
    })

@app.route('/api/categories')
def get_categories():
    df = load_data()
    df_expense = df[(df['Income/Expense'] == 'Expense') & (df['Date'].notna())].copy()
    df_expense['MappedCategory'] = df_expense['Category'].apply(map_category)
    
    # Group by mapped category
    cat_spending = df_expense.groupby('MappedCategory')['Amount'].sum().to_dict()
    
    # Ensure all user categories are listed, even if 0
    target_categories = ['Food', 'Shopping', 'Transport', 'Entertainment', 'Bills', 'Healthcare', 'Other']
    result = {cat: float(cat_spending.get(cat, 0.0)) for cat in target_categories}
    
    # Also return raw categories for sub-level visualization
    raw_spending = df_expense.groupby('Category')['Amount'].sum().to_dict()
    raw_result = {cat: float(amt) for cat, amt in raw_spending.items()}
    
    return jsonify({
        'mapped': result,
        'raw': raw_result
    })

@app.route('/api/monthly')
def get_monthly():
    df = load_data()
    df = df[df['Date'].notna()].copy()
    # Sort chronological
    df = df.sort_values('Date', ascending=True)
    df['MonthKey'] = df['Date'].dt.to_period('M').astype(str)
    df['MonthName'] = df['Date'].dt.strftime('%b %Y')
    
    # Group by month key and type
    monthly_data = df.groupby(['MonthKey', 'MonthName', 'Income/Expense'])['Amount'].sum().unstack(fill_value=0.0)
    
    months = []
    income = []
    expense = []
    savings = []
    
    for idx, row in monthly_data.iterrows():
        months.append(idx[1]) # MonthName
        inc = float(row.get('Income', 0.0))
        exp = float(row.get('Expense', 0.0))
        income.append(inc)
        expense.append(exp)
        savings.append(inc - exp)
        
    return jsonify({
        'labels': months,
        'income': income,
        'expense': expense,
        'savings': savings
    })

@app.route('/api/weekly')
def get_weekly():
    df = load_data()
    df_expense = df[(df['Income/Expense'] == 'Expense') & (df['Date'].notna())].copy()
    # Sort chronological
    df_expense = df_expense.sort_values('Date', ascending=True)
    
    # Weekly spending
    df_expense['WeekKey'] = df_expense['Date'].dt.to_period('W').astype(str)
    
    weekly_spending = df_expense.groupby('WeekKey')['Amount'].sum()
    
    # Format labels as e.g. "Wk 48 (11/22)"
    labels = []
    for wk in weekly_spending.index:
        try:
            # Parse start date of the week
            start_date = pd.to_datetime(wk + '-1', format='%Y-%W-%w')
            label = start_date.strftime('Wk %U (%m/%d)')
        except:
            label = wk
        labels.append(label)
        
    return jsonify({
        'labels': labels,
        'values': [float(val) for val in weekly_spending.values]
    })

@app.route('/api/payment-methods')
def get_payment_methods():
    df = load_data()
    df = df[df['Date'].notna()].copy()
    df['PaymentMethod'] = df['Account'].apply(map_payment_method)
    
    # Counts and total amounts by payment method (for both expenses and income, or expenses only?)
    # Let's filter to expenses only for spending payment method analysis
    df_expense = df[df['Income/Expense'] == 'Expense']
    
    target_methods = ['Cash', 'UPI', 'Credit Card', 'Debit Card']
    
    method_counts = df_expense['PaymentMethod'].value_counts().to_dict()
    method_amounts = df_expense.groupby('PaymentMethod')['Amount'].sum().to_dict()
    
    counts_result = {m: int(method_counts.get(m, 0)) for m in target_methods}
    amounts_result = {m: float(method_amounts.get(m, 0.0)) for m in target_methods}
    
    return jsonify({
        'counts': counts_result,
        'amounts': amounts_result
    })

@app.route('/api/daily-trends')
def get_daily_trends():
    df = load_data()
    df_expense = df[(df['Income/Expense'] == 'Expense') & (df['Date'].notna())].copy()
    
    # Spending by Day of Week
    df_expense['DayName'] = df_expense['Date'].dt.day_name()
    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    day_spending = df_expense.groupby('DayName')['Amount'].sum().reindex(day_order, fill_value=0.0)
    
    # Top 5 highest spending dates
    df_date_spending = df_expense.groupby(df_expense['Date'].dt.strftime('%Y-%m-%d'))['Amount'].sum()
    top_dates = df_date_spending.sort_values(ascending=False).head(5)
    
    return jsonify({
        'days': {
            'labels': day_order,
            'values': [float(v) for v in day_spending.values]
        },
        'top_dates': {
            'labels': list(top_dates.index),
            'values': [float(v) for v in top_dates.values]
        }
    })

@app.route('/api/transactions')
def get_transactions():
    df = load_data()
    df = df[df['Date'].notna()].copy()
    
    # Search
    search = request.args.get('search', '').strip().lower()
    if search:
        mask = (df['Category'].astype(str).str.lower().str.contains(search) |
                df['Note'].astype(str).str.lower().str.contains(search) |
                df['Account'].astype(str).str.lower().str.contains(search))
        df = df[mask]
        
    # Filter Category
    category_filter = request.args.get('category', '').strip()
    if category_filter:
        if category_filter != 'All':
            # Match mapped categories
            df['MappedCategory'] = df['Category'].apply(map_category)
            df = df[df['MappedCategory'] == category_filter]
            
    # Filter Type
    type_filter = request.args.get('type', '').strip()
    if type_filter and type_filter != 'All':
        df = df[df['Income/Expense'] == type_filter]
        
    # Sort
    sort_by = request.args.get('sortBy', 'Date')
    sort_order = request.args.get('sortOrder', 'desc')
    ascending = (sort_order == 'asc')
    
    if sort_by == 'Date':
        df = df.sort_values('Date', ascending=ascending)
    elif sort_by == 'Amount':
        df = df.sort_values('Amount', ascending=ascending)
        
    # Pagination
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('perPage', 10))
    except ValueError:
        page = 1
        per_page = 10
        
    total_records = len(df)
    total_pages = int(np.ceil(total_records / per_page)) if total_records > 0 else 1
    page = max(1, min(page, total_pages))
    
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    
    page_df = df.iloc[start_idx:end_idx].copy()
    
    # Format dates to string
    page_df['FormattedDate'] = page_df['Date'].dt.strftime('%Y-%m-%d %H:%M')
    page_df['MappedCategory'] = page_df['Category'].apply(map_category)
    page_df['PaymentMethod'] = page_df['Account'].apply(map_payment_method)
    
    records = []
    for _, row in page_df.iterrows():
        records.append({
            'date': row['FormattedDate'],
            'raw_account': str(row['Account']),
            'payment_method': row['PaymentMethod'],
            'raw_category': str(row['Category']),
            'mapped_category': row['MappedCategory'],
            'note': str(row['Note']),
            'amount': float(row['Amount']),
            'type': str(row['Income/Expense'])
        })
        
    return jsonify({
        'transactions': records,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total_records': total_records,
            'total_pages': total_pages
        }
    })

if __name__ == '__main__':
    # Automatically load data once on start to verify
    try:
        df_test = load_data()
        print(f"Flask App loaded dataset successfully. Loaded {len(df_test)} rows.")
    except Exception as ex:
        print(f"Error loading CSV at startup: {ex}")
        
    app.run(host='127.0.0.1', port=5001, debug=True)
