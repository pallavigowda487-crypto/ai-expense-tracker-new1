import os

import pandas as pd
import requests
import streamlit as st

DEFAULT_BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL") or st.secrets.get("BACKEND_BASE_URL") or "http://localhost:5000"


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

    if DEFAULT_BACKEND_BASE_URL == "http://localhost:5000":
        st.info(
            "Set BACKEND_BASE_URL in Streamlit secrets or environment variables to point this dashboard at your deployed backend."
        )

    backend_url = st.text_input(
        "Backend URL",
        value=DEFAULT_BACKEND_BASE_URL,
        help="Use Streamlit secrets or environment variables for a deployed backend URL.",
    )

    if not backend_url:
        st.warning("Enter a backend URL before loading expenses.")
        st.stop()

    try:
        expenses = load_expenses(backend_url)
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
