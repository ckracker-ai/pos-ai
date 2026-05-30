import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BranchStore {
  selectedBranchId: string;
  activeBranchLabel: string;
  setSelectedBranchId: (id: string) => void;
  setActiveBranchLabel: (label: string) => void;
}

export const useBranchStore = create<BranchStore>()(
  persist(
    (set) => ({
      selectedBranchId:
        process.env.NEXT_PUBLIC_DEFAULT_BRANCH_ID || '48d4ee18-5349-11f1-a915-00ff541b88ad',
      activeBranchLabel: 'Cargando…',
      setSelectedBranchId: (id: string) => set({ selectedBranchId: id }),
      setActiveBranchLabel: (label: string) => set({ activeBranchLabel: label }),
    }),
    {
      name: 'branch-store',
      partialize: (state) => ({ selectedBranchId: state.selectedBranchId }),
    }
  )
);
