import { create } from 'zustand'

export interface PopupInfo {
  longitude: number
  latitude: number
  layerName: string
  displayName: string
  layerType: string
  accentColor: string
  properties: Record<string, unknown>
  popupSpec: Record<string, unknown>
}

export interface PickerCandidate {
  layerName: string
  displayName: string
  layerType: string
  accentColor: string
  properties: Record<string, unknown>
  popupSpec: Record<string, unknown>
}

export interface PickerState {
  longitude: number
  latitude: number
  candidates: PickerCandidate[]
}

interface PopupStore {
  popup: PopupInfo | null
  picker: PickerState | null
  setPopup: (popup: PopupInfo | null) => void
  setPicker: (picker: PickerState | null) => void
  closePopup: () => void
  closePicker: () => void
}

export const usePopupStore = create<PopupStore>((set) => ({
  popup: null,
  picker: null,
  setPopup: (popup) => set({ popup, picker: null }),
  setPicker: (picker) => set({ picker, popup: null }),
  closePopup: () => set({ popup: null }),
  closePicker: () => set({ picker: null }),
}))
