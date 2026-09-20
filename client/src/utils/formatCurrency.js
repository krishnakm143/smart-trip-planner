const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export const formatCurrency = (amount) => inr.format(amount ?? 0)

export const formatFee = (amount) => (amount > 0 ? inr.format(amount) : 'Free entry')
