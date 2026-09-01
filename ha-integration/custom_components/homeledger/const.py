"""Constants for the HomeLedger integration."""

DOMAIN = "homeledger"
MANUFACTURER = "HomeLedger"

# Configuration
CONF_API_URL = "api_url"
CONF_API_KEY = "api_key"

# Defaults
DEFAULT_SCAN_INTERVAL = 300  # 5 minutes in seconds
DEFAULT_API_URL = "http://localhost:3000"

# Sensor keys
SENSOR_MONTHLY_EXPENSES = "monthly_expenses"
SENSOR_MONTHLY_INCOME = "monthly_income"
SENSOR_MONTHLY_SAVINGS = "monthly_savings"
SENSOR_REMAINING_BUDGET = "remaining_budget"
SENSOR_NET_WORTH = "net_worth"
SENSOR_TOTAL_BALANCE = "total_balance"
SENSOR_CREDIT_UTILIZATION = "credit_card_utilization"

# Binary sensor keys
BINARY_SENSOR_OVER_BUDGET = "over_budget"
BINARY_SENSOR_HIGH_CREDIT = "high_credit_utilization"
BINARY_SENSOR_PAYMENT_DUE = "payment_due_soon"
BINARY_SENSOR_LOW_BALANCE = "low_balance"

# Services
SERVICE_CREATE_TRANSACTION = "create_transaction"
SERVICE_CREATE_QUICK_EXPENSE = "create_quick_expense"
SERVICE_REFRESH_DATA = "refresh_data"
