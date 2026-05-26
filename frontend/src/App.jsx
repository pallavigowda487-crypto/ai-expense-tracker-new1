import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const emptyForm = {
  title: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
};

function App() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');

  const totalSpent = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenses]
  );

  const categoryBreakdown = useMemo(() => {
    return expenses.reduce((acc, expense) => {
      const category = expense.category || 'Unclassified';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
  }, [expenses]);

  async function fetchExpenses() {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/expenses`);
      setExpenses(response.data);
    } catch (error) {
      setMessage('Unable to load expenses right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExpenses();
  }, []);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setImageFile(null);
      setPreview('');
      return;
    }

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title || !form.amount || !form.date) {
      setMessage('Please complete all required fields.');
      return;
    }

    const payload = new FormData();
    payload.append('title', form.title);
    payload.append('amount', form.amount);
    payload.append('date', form.date);

    if (imageFile) {
      payload.append('image', imageFile);
    }

    try {
      const url = editingId
        ? `${API_BASE}/api/expenses/${editingId}`
        : `${API_BASE}/api/expenses`;
      const method = editingId ? 'put' : 'post';

      await axios({
        method,
        url,
        data: payload,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setForm(emptyForm);
      setImageFile(null);
      setPreview('');
      setEditingId(null);
      setMessage(editingId ? 'Expense updated successfully.' : 'Expense created successfully.');
      await fetchExpenses();
    } catch (error) {
      setMessage('Something went wrong while saving the expense.');
    }
  }

  function startEditing(expense) {
    setEditingId(expense._id);
    setForm({
      title: expense.title,
      amount: String(expense.amount),
      date: new Date(expense.date).toISOString().slice(0, 10),
    });
    setImageFile(null);
    setPreview(expense.imageUrl ? `${API_BASE}${expense.imageUrl}` : '');
    setMessage('Edit mode enabled. Upload a new image to re-run AI classification.');
  }

  async function handleDelete(id) {
    try {
      await axios.delete(`${API_BASE}/api/expenses/${id}`);
      setMessage('Expense deleted successfully.');
      await fetchExpenses();
    } catch (error) {
      setMessage('Unable to delete the expense.');
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">AI-Powered Expense Tracker</p>
          <h1>Track, classify, and manage every bill with Gemini-powered insights.</h1>
          <p className="subtitle">
            Upload receipts, let the AI classify them, and keep your spending organized in a responsive dashboard.
          </p>
        </div>
        <div className="hero-badge">
          <span>Total Spent</span>
          <strong>${totalSpent.toFixed(2)}</strong>
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <span>Total Expenses</span>
          <strong>{expenses.length}</strong>
        </article>
        <article className="stat-card">
          <span>Categories</span>
          <strong>{Object.keys(categoryBreakdown).length}</strong>
        </article>
        <article className="stat-card">
          <span>Top Category</span>
          <strong>{Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}</strong>
        </article>
      </section>

      {message && <div className="message-banner">{message}</div>}

      <section className="layout-grid">
        <form className="expense-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Update Expense' : 'Create Expense'}</h2>

          <label>
            Expense Title
            <input name="title" value={form.title} onChange={handleFormChange} placeholder="Coffee with team" />
          </label>

          <label>
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              name="amount"
              value={form.amount}
              onChange={handleFormChange}
              placeholder="12.50"
            />
          </label>

          <label>
            Date
            <input type="date" name="date" value={form.date} onChange={handleFormChange} />
          </label>

          <label>
            Upload Receipt Image
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} />
          </label>

          <div className="preview-box">
            {preview ? (
              <img src={preview} alt="Receipt preview" className="receipt-preview" />
            ) : (
              <p>Upload an image to enable AI classification.</p>
            )}
          </div>

          <div className="button-row">
            <button type="submit" className="primary-btn">
              {editingId ? 'Save Changes' : 'Add Expense'}
            </button>
            {editingId && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setImageFile(null);
                  setPreview('');
                  setMessage('Edit cancelled.');
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div>
          <div className="dashboard-header">
            <h2>Expense Dashboard</h2>
            <span>{loading ? 'Loading…' : `${expenses.length} saved entries`}</span>
          </div>

          <div className="expense-grid">
            {expenses.map((expense) => (
              <article className="expense-card" key={expense._id}>
                <img
                  src={expense.imageUrl ? `${API_BASE}${expense.imageUrl}` : 'https://via.placeholder.com/400x240?text=No+Image'}
                  alt={expense.title}
                  className="expense-image"
                />

                <div className="expense-body">
                  <div>
                    <p className="expense-title">{expense.title}</p>
                    <p className="expense-amount">${Number(expense.amount).toFixed(2)}</p>
                  </div>
                  <span className="category-pill">{expense.category}</span>
                  <p className="expense-date">{new Date(expense.date).toLocaleDateString()}</p>
                </div>

                <div className="button-row card-actions">
                  <button type="button" className="primary-btn" onClick={() => startEditing(expense)}>
                    Update
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => handleDelete(expense._id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
