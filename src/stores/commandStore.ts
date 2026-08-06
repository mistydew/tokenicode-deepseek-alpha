import { create } from 'zustand';
import { bridge, type UnifiedCommand } from '../lib/tauri-bridge';
import { useSettingsStore } from './settingsStore';

interface CommandState {
  // All available commands (built-in + custom)
  commands: UnifiedCommand[];
  isLoading: boolean;

  // Prefix mode: when a custom command with $ARGUMENTS is selected
  activePrefixes: UnifiedCommand[];

  // Actions
  fetchCommands: (cwd?: string) => Promise<void>;
  addPrefix: (cmd: UnifiedCommand) => void;
  removePrefix: (name: string) => void;
  clearPrefixes: () => void;
}

export const useCommandStore = create<CommandState>()((set) => ({
  commands: [],
  isLoading: false,
  activePrefixes: [],

  fetchCommands: async (cwd?: string) => {
    set({ isLoading: true });
    try {
      const commands = await bridge.listAllCommands(cwd, useSettingsStore.getState().skillDirectories);
      set({ commands, isLoading: false });
    } catch (err) {
      console.error('[commandStore] fetchCommands failed:', err);
      set({ isLoading: false });
    }
  },

  addPrefix: (cmd) => set((state) => {
    if (cmd.category !== 'skill') return { activePrefixes: [cmd] };
    if (state.activePrefixes.some((item) => item.name === cmd.name)) return state;
    return { activePrefixes: [...state.activePrefixes.filter((item) => item.category === 'skill'), cmd] };
  }),
  removePrefix: (name) => set((state) => ({
    activePrefixes: state.activePrefixes.filter((item) => item.name !== name),
  })),
  clearPrefixes: () => set({ activePrefixes: [] }),
}));
