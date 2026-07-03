# Expense Analyzer Dashboard

## Overview

Expense Analyzer Dashboard is a web-based expense analysis application built using Flask, HTML, CSS, JavaScript, and Chart.js. The dashboard provides interactive visualizations and insights from historical expense records stored in a CSV file. It helps users understand spending habits, monitor budgets, analyze savings, and identify financial trends.

The application is designed as a read-only analytical dashboard, ensuring the original dataset remains unchanged while providing meaningful insights.

---

## Features

- Interactive expense dashboard
- Category-wise spending analysis
- Monthly expense trends
- Weekly spending pattern visualization
- Daily expense analysis
- Payment method statistics
- Budget tracking with spending alerts
- Monthly savings analysis
- Responsive user interface
- REST API powered by Flask

---

## Project Structure

```
expense_analyzer/
│
├── app.py
├── requirements.txt
├── run.bat
│
├── templates/
│   └── index.html
│
├── static/
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       └── app.js
│
├── expense_data_1.csv
└── README.md
```

---

## Technologies Used

- Python
- Flask
- HTML5
- CSS3
- JavaScript
- Chart.js
- Pandas

---

## Dashboard Features

### Category-wise Expense Analysis

Expenses are grouped into standardized categories including:

- Food
- Shopping
- Transport
- Entertainment
- Bills
- Healthcare
- Other

The dashboard identifies the highest spending category and displays category-wise distribution using charts.

---

### Monthly Expense Analysis

Displays total expenses for each month and identifies:

- Highest spending month
- Lowest spending month
- Monthly spending trends

---

### Weekly Spending Analysis

Visualizes weekly spending patterns to identify:

- Spending spikes
- Weekly averages
- Seasonal variations

---

### Payment Method Analysis

Displays the frequency of payment methods used throughout the dataset.

Example:

- UPI
- Cash

---

### Daily Expense Trends

Analyzes expenses based on the day of the week to identify which days contribute the most to overall spending.

---

### Budget Tracking

Users can set a monthly budget.

The dashboard displays:

- Current spending
- Remaining budget
- Progress bar
- Budget exceeded alerts

---

### Savings Analysis

Calculates monthly savings using:

```
Savings = Income − Expenses
```

The dashboard displays:

- Monthly income
- Monthly expenses
- Savings or deficit
- Overall financial summary

---

## API

The Flask backend provides REST endpoints that return summarized analytical data for the frontend dashboard.

Example endpoint:

```
/api/summary
```

---

## Installation

Clone the repository

```bash
git clone https://github.com/your-username/expense_analyzer.git
```

Navigate to the project directory

```bash
cd expense_analyzer
```

Install the required dependencies

```bash
pip install -r requirements.txt
```

---

## Running the Application

### Option 1

Double-click

```
run.bat
```

### Option 2

Run using Python

```bash
python app.py
```

Open your browser and visit

```
http://127.0.0.1:5001
```

---

## Dataset

The dashboard analyzes historical expense records stored in:

```
expense_data_1.csv
```

The application is read-only and does not modify the original dataset.

---

## Sample Insights

The dashboard provides insights such as:

- Highest spending category
- Monthly spending comparison
- Weekly expense patterns
- Most frequently used payment method
- Daily spending distribution
- Budget utilization
- Monthly savings and deficits

---

## Future Enhancements

- CSV file upload support
- User authentication
- Multiple user accounts
- Expense prediction using Machine Learning
- Export reports as PDF
- Interactive filtering by category and date
- Database integration
- Dark and light theme support

---

## License

This project is developed for educational and learning purposes.

---

## Author

Evangelin Dorathy
