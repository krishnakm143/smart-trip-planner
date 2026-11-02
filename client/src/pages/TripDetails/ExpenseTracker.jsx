import { useCallback, useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import { formatCurrency } from '../../utils/formatCurrency'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, labelFor } from '../../utils/constants'
import { createExpense, deleteExpense, getExpenseSummary, listExpenses } from '../../services/tripService'
import { useResource } from '../../hooks/useResource'
import { useToast } from '../../context/ToastContext'
import styles from './ExpenseTracker.module.css'

const today = () => new Date().toISOString().slice(0, 10)

const CURRENCIES = [
  { code: 'INR', symbol: '₹', rate: 1 },
  { code: 'USD', symbol: '$', rate: 86.5 },
  { code: 'EUR', symbol: '€', rate: 92.0 },
  { code: 'GBP', symbol: '£', rate: 109.5 },
  { code: 'AED', symbol: 'AED', rate: 23.5 },
]

export default function ExpenseTracker({ trip }) {
  const { notify } = useToast()
  const members = trip.members && trip.members.length > 0 ? trip.members : ['Me']

  const load = useCallback((signal) => listExpenses(trip.id, signal), [trip.id])
  const { data: expenses, loading, error, retry, setData } = useResource(load)

  const [summaryData, setSummaryData] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [currency, setCurrency] = useState('INR')
  const [rawAmount, setRawAmount] = useState('')

  const [form, setForm] = useState({
    title: '',
    category: 'food',
    spentOn: today(),
    paymentMethod: 'upi',
    paidBy: members[0] || 'Me',
    splitType: 'equal',
    notes: '',
  })

  const [settledMap, setSettledMap] = useState({})

  function toggleSettled(key) {
    setSettledMap((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const fetchSummary = useCallback(() => {
    getExpenseSummary(trip.id)
      .then((res) => setSummaryData(res.data))
      .catch(() => {})
  }, [trip.id])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary, expenses])

  const selectedCurrencyObj = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0]
  const convertedInrAmount = Math.round((Number(rawAmount) || 0) * selectedCurrencyObj.rate)

  const totalSpent = expenses?.reduce((sum, item) => sum + item.amount, 0) ?? 0
  const tripBudgetTotal = trip.budget?.total ?? 0
  const percentUsed = tripBudgetTotal > 0 ? Math.min(Math.round((totalSpent / tripBudgetTotal) * 100), 100) : 0
  const remaining = tripBudgetTotal - totalSpent
  const isOverBudget = remaining < 0

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.title.trim() || !rawAmount) return

    setBusy(true)
    try {
      const payload = {
        title: form.title.trim(),
        amount: convertedInrAmount,
        category: form.category,
        spentOn: form.spentOn,
        paymentMethod: form.paymentMethod,
        paidBy: form.paidBy,
        splitType: form.splitType,
        currency,
        exchangeRate: selectedCurrencyObj.rate,
        notes: form.notes ? form.notes.trim() : '',
      }

      const item = await createExpense(trip.id, payload)
      setData((items) => [item, ...(items || [])])
      notify(`Expense added: ${item.title}`)
      setRawAmount('')
      setForm({
        title: '',
        category: 'food',
        spentOn: today(),
        paymentMethod: 'upi',
        paidBy: members[0] || 'Me',
        splitType: 'equal',
        notes: '',
      })
      setShowAddForm(false)
      fetchSummary()
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(expenseId, title) {
    try {
      await deleteExpense(trip.id, expenseId)
      setData((items) => items.filter((entry) => entry.id !== expenseId))
      notify(`Deleted "${title}"`)
      fetchSummary()
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  if (loading) return <p style={{ color: 'var(--ink-soft)' }}>Loading trip expenses…</p>
  if (error) {
    return (
      <div className={styles.wrapper}>
        <p style={{ color: 'var(--danger)' }}>Failed to load expenses</p>
        <Button variant="secondary" size="sm" onClick={retry}>
          Retry
        </Button>
      </div>
    )
  }

  const categoryTotals = expenses?.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount
    return acc
  }, {}) ?? {}

  const settlements = summaryData?.settlements || []

  return (
    <section className={styles.wrapper} aria-labelledby="expenses-heading">
      <div className={styles.header}>
        <h2 id="expenses-heading" className={styles.title}>
          <Wallet size={20} aria-hidden="true" style={{ color: 'var(--primary)' }} />
          Trip Expenses & Splitting
        </h2>
        <Button
          size="sm"
          variant={showAddForm ? 'ghost' : 'secondary'}
          onClick={() => setShowAddForm((v) => !v)}
        >
          {showAddForm ? (
            'Cancel'
          ) : (
            <>
              <Plus size={14} aria-hidden="true" />
              Add Expense
            </>
          )}
        </Button>
      </div>

      {/* Spending vs Budget Progress */}
      <div className={styles.budgetProgress}>
        <div className={styles.progressNumbers}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: 600 }}>
              Total Spending
            </span>
            <div className={styles.totalSpent}>{formatCurrency(totalSpent)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
              of {formatCurrency(tripBudgetTotal)} estimated
            </span>
            <div style={{ fontWeight: 600, color: isOverBudget ? 'var(--danger, #ef4444)' : 'var(--success, #16a34a)' }}>
              {isOverBudget
                ? `${formatCurrency(Math.abs(remaining))} over estimate`
                : `${formatCurrency(remaining)} remaining`}
            </div>
          </div>
        </div>

        <div className={styles.progressTrack} role="progressbar" aria-valuenow={percentUsed} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`${styles.progressBar} ${
              isOverBudget ? styles.barDanger : percentUsed > 80 ? styles.barWarning : styles.barNormal
            }`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>

        {/* Category Breakdown Cards */}
        <div className={styles.categoryGrid}>
          {EXPENSE_CATEGORIES.map((cat) => {
            const amt = categoryTotals[cat] || 0
            return (
              <div key={cat} className={styles.categoryCard}>
                <span className={styles.categoryLabel}>{cat}</span>
                <span className={styles.categoryAmount}>{formatCurrency(amt)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Group Settlements / Who Owes Whom */}
      {members.length > 1 && settlements.length > 0 && (
        <div className={styles.settlementsCard}>
          <div className={styles.settlementsTitle}>
            <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Who Owes Whom (Settlement Matrix)
          </div>
          <ul className={styles.settlementList}>
            {settlements.map((s, idx) => {
              const key = `${s.from}-${s.to}-${s.amount}`
              const isSettled = Boolean(settledMap[key])
              return (
                <li
                  key={idx}
                  className={styles.settlementItem}
                  style={{
                    opacity: isSettled ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => toggleSettled(key)}
                      style={{
                        background: isSettled ? '#16a34a' : 'transparent',
                        color: isSettled ? '#ffffff' : 'var(--ink-soft)',
                        border: '1px solid var(--line)',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title={isSettled ? 'Mark debt as unsettled' : 'Mark debt as settled / paid'}
                    >
                      {isSettled ? '✓ Settled' : 'Mark Paid'}
                    </button>
                    <span style={{ textDecoration: isSettled ? 'line-through' : 'none' }}>
                      <strong>{s.from}</strong> owes <strong>{s.to}</strong>
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, textDecoration: isSettled ? 'line-through' : 'none' }}>
                    {formatCurrency(s.amount)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Add Expense Form */}
      {showAddForm && (
        <form className={styles.formBox} onSubmit={handleCreate}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Record an Expense
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              required
              aria-label="Expense title"
              style={{ flex: 2 }}
              maxLength={80}
              placeholder="What did you pay for? (e.g. Dinner, Fuel, Entry tickets)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <select
              aria-label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ width: '5.5rem' }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
            <input
              required
              aria-label="Expense amount"
              type="number"
              min="1"
              style={{ flex: 1 }}
              placeholder={`Amount in ${currency}`}
              value={rawAmount}
              onChange={(e) => setRawAmount(e.target.value)}
            />
          </div>

          {currency !== 'INR' && rawAmount && (
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '0.75rem' }}>
              ≈ {formatCurrency(convertedInrAmount)} (Rate: 1 {currency} = ₹{selectedCurrencyObj.rate})
            </p>
          )}

          <div className={styles.formGrid}>
            <div>
              <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Category</label>
              <select
                aria-label="Expense category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Payment Method</label>
              <select
                aria-label="Payment method"
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>

            {members.length > 1 && (
              <div>
                <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Paid By</label>
                <select
                  aria-label="Paid by"
                  value={form.paidBy}
                  onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
                >
                  {members.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Date</label>
              <input
                required
                type="date"
                value={form.spentOn}
                onChange={(e) => setForm({ ...form, spentOn: e.target.value })}
              />
            </div>
          </div>

          <input
            type="text"
            placeholder="Optional notes or bill reference"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            style={{ marginBottom: '0.75rem', width: '100%' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" busy={busy}>
              Save Expense
            </Button>
          </div>
        </form>
      )}

      {/* Expense History List */}
      {expenses && expenses.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem', textAlign: 'center', marginBlock: '1rem' }}>
          No expenses recorded yet. Click &ldquo;Add Expense&rdquo; to track your real travel spending!
        </p>
      ) : (
        <ul className={styles.expenseList}>
          {expenses?.map((item) => (
            <li key={item.id} className={styles.expenseItem}>
              <div className={styles.expenseMain}>
                <span className={styles.expenseTitle}>{item.title}</span>
                <div className={styles.expenseMeta}>
                  <span className={styles.badge}>{item.category}</span>
                  <span>{item.spentOn}</span>
                  {item.paidBy && item.paidBy !== 'Me' && <span>Paid by {item.paidBy}</span>}
                  {item.paymentMethod && <span>via {labelFor(item.paymentMethod)}</span>}
                </div>
                {item.notes && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                    {item.notes}
                  </span>
                )}
              </div>

              <div className={styles.expenseRight}>
                <span className={styles.expenseAmount}>{formatCurrency(item.amount)}</span>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  title="Delete expense"
                  onClick={() => handleDelete(item.id, item.title)}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
