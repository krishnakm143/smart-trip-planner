import { useState } from 'react'
import { Package, Plus, Sparkles, Trash2 } from 'lucide-react'
import Button from '../../components/ui/Button'
import { PACKING_CATEGORIES } from '../../utils/constants'
import styles from './PackingList.module.css'

function generateSmartTemplate(destination, days, tripMode) {
  const destSlug = destination?.slug?.toLowerCase() || ''
  const isCold = ['manali', 'shimla', 'ladakh', 'darjeeling'].includes(destSlug)
  const isBeach = ['goa'].includes(destSlug)

  const template = [
    // Documents
    { id: 'doc-1', category: 'documents', item: 'Government Photo ID / Aadhaar / Passport', packed: false },
    { id: 'doc-2', category: 'documents', item: 'Flight / Train / Hotel Booking Vouchers', packed: false },
    { id: 'doc-3', category: 'documents', item: 'Emergency Cash & Debit/Credit Cards', packed: false },

    // Electronics
    { id: 'elec-1', category: 'electronics', item: 'Smartphone & Fast Charger', packed: false },
    { id: 'elec-2', category: 'electronics', item: 'Power Bank (10,000+ mAh)', packed: false },
    { id: 'elec-3', category: 'electronics', item: 'Earphones / Headphones', packed: false },

    // Health
    { id: 'med-1', category: 'medication', item: 'Personal Prescriptions & Pain Relievers', packed: false },
    { id: 'med-2', category: 'medication', item: 'Band-aids & Antiseptic Ointment', packed: false },
    { id: 'med-3', category: 'medication', item: 'Electrolyte Packets (ORS) & Motion Sickness Pills', packed: false },

    // Toiletries
    { id: 'toil-1', category: 'toiletries', item: 'Toothbrush, Toothpaste & Floss', packed: false },
    { id: 'toil-2', category: 'toiletries', item: 'Sunscreen (SPF 50+) & Lip Balm', packed: false },
    { id: 'toil-3', category: 'toiletries', item: 'Moisturizer & Hand Sanitizer', packed: false },
  ]

  if (tripMode === 'family') {
    template.push({ id: 'fam-1', category: 'other', item: 'Family snacks & wet wipes', packed: false })
  } else if (tripMode === 'friends') {
    template.push({ id: 'frn-1', category: 'other', item: 'Card games & portable Bluetooth speaker', packed: false })
  }

  // Climate-specific clothing
  if (isCold) {
    template.push(
      { id: 'cl-1', category: 'clothing', item: `Thermal Innerwear tops & bottoms (${Math.min(days, 3)} pairs)`, packed: false },
      { id: 'cl-2', category: 'clothing', item: 'Warm Fleece or Woollen Sweaters', packed: false },
      { id: 'cl-3', category: 'clothing', item: 'Heavy Windproof / Down Jacket', packed: false },
      { id: 'cl-4', category: 'clothing', item: 'Woollen Beanie, Gloves & Woollen Socks', packed: false },
      { id: 'cl-5', category: 'clothing', item: 'Sturdy Hiking Boots or Grip Sneakers', packed: false },
    )
  } else if (isBeach) {
    template.push(
      { id: 'cl-1', category: 'clothing', item: `Breathable Cotton / Linen Outfits (${days} changes)`, packed: false },
      { id: 'cl-2', category: 'clothing', item: 'Swimwear & Beach Towel', packed: false },
      { id: 'cl-3', category: 'clothing', item: 'Sun Hat & UV-cut Sunglasses', packed: false },
      { id: 'cl-4', category: 'clothing', item: 'Water-resistant Flip Flops / Sandals', packed: false },
    )
  } else {
    template.push(
      { id: 'cl-1', category: 'clothing', item: `Comfortable Day Wear Outfits (${days} changes)`, packed: false },
      { id: 'cl-2', category: 'clothing', item: 'Light Layer or Cardigan for Air Conditioning / Evenings', packed: false },
      { id: 'cl-3', category: 'clothing', item: 'Scarf / Shawl for Monuments and Temples', packed: false },
      { id: 'cl-4', category: 'clothing', item: 'Comfortable Broken-in Walking Shoes', packed: false },
    )
  }

  // Accessories
  template.push(
    { id: 'acc-1', category: 'accessories', item: 'Compact Umbrella or Rain Poncho', packed: false },
    { id: 'acc-2', category: 'accessories', item: 'Reusable Water Bottle', packed: false },
    { id: 'acc-3', category: 'accessories', item: 'Compact Lightweight Daypack (under 20L)', packed: false },
  )

  return template
}

export default function PackingList({ trip, onSave }) {
  const members = trip.members && trip.members.length > 0 ? trip.members : ['Me']
  const [items, setItems] = useState(trip.packingList || [])
  const [newItemText, setNewItemText] = useState('')
  const [newCategory, setNewCategory] = useState('clothing')
  const [assignedTo, setAssignedTo] = useState('')

  const totalCount = items.length
  const packedCount = items.filter((i) => i.packed).length
  const percentComplete = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0

  function persist(newItems) {
    setItems(newItems)
    onSave?.({ packingList: newItems })
  }

  function handleToggle(id) {
    const updated = items.map((item) => (item.id === id ? { ...item, packed: !item.packed } : item))
    persist(updated)
  }

  function handleDelete(id) {
    const updated = items.filter((item) => item.id !== id)
    persist(updated)
  }

  function handleAddItem(e) {
    e.preventDefault()
    if (!newItemText.trim()) return

    const item = {
      id: `custom-${Date.now()}`,
      category: newCategory,
      item: newItemText.trim(),
      packed: false,
      assignedTo: assignedTo || '',
    }

    persist([...items, item])
    setNewItemText('')
    setAssignedTo('')
  }

  function handleAutoGenerate() {
    const template = generateSmartTemplate(trip.destination, trip.days, trip.tripMode)
    persist(template)
  }

  return (
    <section className={styles.wrapper} aria-labelledby="packing-heading">
      <div className={styles.header}>
        <h2 id="packing-heading" className={styles.title}>
          <Package size={20} aria-hidden="true" style={{ color: 'var(--primary, #0284c7)' }} />
          Packing Checklist
        </h2>
        <Button variant="ghost" size="sm" onClick={handleAutoGenerate}>
          <Sparkles size={14} aria-hidden="true" />
          {items.length === 0 ? 'Generate Smart Checklist' : 'Reset with Smart Suggestions'}
        </Button>
      </div>

      {totalCount > 0 && (
        <div className={styles.progressContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
            <span>
              <strong>{packedCount}</strong> of <strong>{totalCount}</strong> items packed
            </span>
            <span style={{ fontWeight: 600 }}>{percentComplete}% Ready</span>
          </div>
          <div className={styles.progressBarTrack}>
            <div className={styles.progressBarFill} style={{ width: `${percentComplete}%` }} />
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem', textAlign: 'center', marginBlock: '1.5rem' }}>
          No items yet! Click <strong>&ldquo;Generate Smart Checklist&rdquo;</strong> to get instant climate and activity-tailored packing suggestions for {trip.destination?.name}.
        </p>
      ) : (
        PACKING_CATEGORIES.map((cat) => {
          const catItems = items.filter((i) => i.category === cat.value)
          if (catItems.length === 0) return null

          return (
            <div key={cat.value} className={styles.categoryGroup}>
              <div className={styles.categoryTitle}>
                <span>{cat.label}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', fontWeight: 500 }}>
                  {catItems.filter((i) => i.packed).length}/{catItems.length}
                </span>
              </div>
              <ul className={styles.itemList}>
                {catItems.map((item) => (
                  <li key={item.id} className={`${styles.itemRow} ${item.packed ? styles.itemPacked : ''}`}>
                    <label className={styles.itemLeft}>
                      <input
                        type="checkbox"
                        checked={item.packed}
                        onChange={() => handleToggle(item.id)}
                        className={styles.checkbox}
                      />
                      <span className={styles.itemText}>{item.item}</span>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {item.assignedTo && <span className={styles.assignedBadge}>{item.assignedTo}</span>}
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        title="Remove item"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })
      )}

      {/* Add Custom Item */}
      <form onSubmit={handleAddItem} className={styles.addForm}>
        <input
          required
          type="text"
          placeholder="Add packing item (e.g. Hiking poles, Rain cover)"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          style={{ flex: 2 }}
        />
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          style={{ width: '9rem' }}
        >
          {PACKING_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {members.length > 1 && (
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            style={{ width: '7rem' }}
          >
            <option value="">Assign (All)</option>
            {members.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
        <Button type="submit" size="sm" variant="secondary">
          <Plus size={14} aria-hidden="true" />
          Add
        </Button>
      </form>
    </section>
  )
}
