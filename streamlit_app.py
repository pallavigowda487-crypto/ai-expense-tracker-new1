import os
from urllib.parse import urlparse

import pandas as pd
import requests
import streamlit as st

DEFAULT_BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL") or st.secrets.get("BACKEND_BASE_URL")


def is_placeholder_backend_url(backend_url):
    normalized = backend_url.strip().lower()
    return (
        normalized in {
            "http://your-deployed-backend-url.com",
            "https://your-deployed-backend-url.com",
            "http://your-backend-url.com",
            "https://your-backend-url.com",
        }
        or "your-deployed-backend-url.com" in normalized
        or "your-backend-url.com" in normalized
    )


def is_valid_backend_url(backend_url):
    parsed = urlparse(backend_url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


@st.cache_data(show_spinner=False)
def load_expenses(backend_url):
    response = requests.get(f"{backend_url}/api/expenses", timeout=15)
    response.raise_for_status()
    data = response.json()

    if not data:
        return pd.DataFrame(columns=["title", "amount", "category", "date", "imageUrl"])

    return pd.DataFrame(data)


def main():
    st.set_page_config(page_title="AI Expense Tracker", layout="wide")

    st.title("AI Expense Tracker Dashboard")
    st.caption("Live view of expenses from the existing backend API.")

    if not DEFAULT_BACKEND_BASE_URL:
        st.info(
            "Set BACKEND_BASE_URL in Streamlit secrets or environment variables, or enter the deployed backend URL below."
        )

    backend_url = st.text_input(
        "Backend URL",
        value=DEFAULT_BACKEND_BASE_URL or "",
        placeholder="https://your-backend-url.com",
        help="Use Streamlit secrets, environment variables, or type the deployed backend URL here.",
    ).strip()

    if not backend_url:
        st.warning("Enter the deployed backend URL before loading expenses.")
        st.stop()

    if is_placeholder_backend_url(backend_url):
        st.error(
            "The URL you entered is a placeholder. Replace it with your actual deployed backend URL, for example https://your-backend-url.com."
        )
        st.stop()

    if not is_valid_backend_url(backend_url):
        st.error("Enter a valid backend URL that starts with http:// or https://.")
        st.stop()

    try:
        expenses = load_expenses(backend_url.rstrip("/"))
    except requests.RequestException as exc:
        st.error(f"Unable to connect to backend: {exc}")
        st.stop()

    if expenses.empty:
        st.info("No expenses found yet. Add a few expenses from the React app to see them here.")
        st.stop()

    col1, col2, col3 = st.columns(3)
    col1.metric("Total Expenses", len(expenses))
    col2.metric("Total Spent", f"${expenses['amount'].astype(float).sum():.2f}")
    col3.metric("Categories", expenses["category"].nunique())

    st.subheader("Expense Overview")

    expenses = expenses.copy()
    expenses["amount"] = expenses["amount"].astype(float)
    expenses["date"] = pd.to_datetime(expenses["date"], errors="coerce")
    expenses = expenses.sort_values("date", ascending=False)

    st.dataframe(
        expenses[["title", "amount", "category", "date"]],
        use_container_width=True,
        hide_index=True,
    )

    st.subheader("Receipt Images")

    for _, expense in expenses.iterrows():
        with st.container(border=True):
            col_image, col_details = st.columns([1, 2])

            image_url = expense["imageUrl"]
            if image_url:
                full_image_url = f"{backend_url}{image_url}" if image_url.startswith("/") else image_url
                col_image.image(full_image_url, caption=expense["title"])

            col_details.write(f"**Title:** {expense['title']}")
            col_details.write(f"**Amount:** ${float(expense['amount']):.2f}")
            col_details.write(f"**Category:** {expense['category']}")
            col_details.write(
                f"**Date:** {pd.to_datetime(expense['date']).strftime('%Y-%m-%d') if pd.notna(expense['date']) else 'N/A'}"
            )


if __name__ == "__main__":
    main()
