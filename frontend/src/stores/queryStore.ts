import { create } from 'zustand'

export type FilterOp =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'like'
  | 'not_like'
  | 'is_null'
  | 'is_not_null'

export interface FilterCondition {
  id: string
  field: string
  op: FilterOp
  value: string
}

export interface QueryResultRow {
  [key: string]: unknown
  _lng?: number
  _lat?: number
}

export interface QueryResult {
  rows: QueryResultRow[]
  total: number
  layer_name: string
  display_name: string
}

interface QueryState {
  selectedLayer: string
  logic: 'AND' | 'OR'
  conditions: FilterCondition[]
  limit: number
  result: QueryResult | null
  isOpen: boolean
  resultWindowOpen: boolean

  setSelectedLayer: (name: string) => void
  setLogic: (logic: 'AND' | 'OR') => void
  addCondition: () => void
  updateCondition: (id: string, patch: Partial<FilterCondition>) => void
  removeCondition: (id: string) => void
  clearConditions: () => void
  setLimit: (n: number) => void
  setResult: (r: QueryResult | null) => void
  setOpen: (open: boolean) => void
  setResultWindowOpen: (open: boolean) => void
}

let condIdCounter = 0
const newCond = (): FilterCondition => ({
  id: String(++condIdCounter),
  field: '',
  op: '=',
  value: '',
})

export const useQueryStore = create<QueryState>((set) => ({
  selectedLayer: '',
  logic: 'AND',
  conditions: [newCond()],
  limit: 500,
  result: null,
  isOpen: false,
  resultWindowOpen: false,

  setSelectedLayer: (name) => set({ selectedLayer: name }),
  setLogic: (logic) => set({ logic }),
  addCondition: () =>
    set((s) => ({ conditions: [...s.conditions, newCond()] })),
  updateCondition: (id, patch) =>
    set((s) => ({
      conditions: s.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  removeCondition: (id) =>
    set((s) => ({ conditions: s.conditions.filter((c) => c.id !== id) })),
  clearConditions: () => set({ conditions: [newCond()] }),
  setLimit: (n) => set({ limit: n }),
  setResult: (r) => set({ result: r }),
  setOpen: (open) => set({ isOpen: open }),
  setResultWindowOpen: (open) => set({ resultWindowOpen: open }),
}))
