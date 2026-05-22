import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Expense, ExpenseCategory } from '@/types/expense'

interface ExpenseState {
  expenses: Expense[]
  addExpense: (expense: Expense) => void
  updateExpense: (id: string, partial: Partial<Expense>) => void
  deleteExpense: (id: string) => void
  getByCategory: (category: ExpenseCategory) => Expense[]
  getByPeriod: (month: number, year: number) => Expense[]
  getTotalByPeriod: (month: number, year: number) => { total: number; gst: number; count: number }
  getCategoryTotals: (month: number, year: number) => Record<string, number>
  getItcSummary: (month: number, year: number) => { claimable: number; claimed: number; pending: number }
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    immer((set, get) => ({
      expenses: [],

      addExpense: (expense) => set((state) => { state.expenses.unshift(expense) }),

      updateExpense: (id, partial) =>
        set((state) => {
          const idx = state.expenses.findIndex((e) => e.id === id)
          if (idx !== -1) Object.assign(state.expenses[idx], partial)
        }),

      deleteExpense: (id) =>
        set((state) => { state.expenses = state.expenses.filter((e) => e.id !== id) }),

      getByCategory: (category) => get().expenses.filter((e) => e.category === category),

      getByPeriod: (month, year) =>
        get().expenses.filter((e) => {
          const d = new Date(e.date)
          return d.getMonth() + 1 === month && d.getFullYear() === year
        }),

      getTotalByPeriod: (month, year) => {
        const expenses = get().getByPeriod(month, year)
        return {
          total: expenses.reduce((s, e) => s + e.totalAmount, 0),
          gst: expenses.reduce((s, e) => s + (e.isGstRegistered ? e.gstAmount : 0), 0),
          count: expenses.length,
        }
      },

      getCategoryTotals: (month, year) => {
        const expenses = get().getByPeriod(month, year)
        const totals: Record<string, number> = {}
        for (const e of expenses) {
          totals[e.category] = (totals[e.category] || 0) + e.totalAmount
        }
        return totals
      },

      getItcSummary: (month, year) => {
        const expenses = get().getByPeriod(month, year)
        const claimable = expenses
          .filter((e) => e.isItcEligible && e.isGstRegistered)
          .reduce((s, e) => s + e.gstAmount, 0)
        return { claimable: Math.round(claimable * 100) / 100, claimed: 0, pending: Math.round(claimable * 100) / 100 }
      },
    })),
    { name: 'invozen-expenses' }
  )
)
