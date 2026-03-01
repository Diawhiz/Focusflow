import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAppStore = create(
  persist(
    (set, get) => ({
      habits: [],
      todos: [],
      notes: [],

      addHabit: (title) => set((state) => ({
        habits: [...state.habits, { id: Date.now().toString(), title, streak: 0, lastCompleted: null }]
      })),

      toggleHabit: (id) => set((state) => {
        const today = new Date().toISOString().split('T')[0];
        return {
          habits: state.habits.map(h => {
            if (h.id === id && h.lastCompleted !== today) {
              return { ...h, streak: h.streak + 1, lastCompleted: today };
            }
            return h;
          })
        };
      }),

      undoHabit: (id) => set((state) => ({
        habits: state.habits.map(h => 
          h.id === id ? { ...h, streak: Math.max(0, h.streak - 1), lastCompleted: null } : h
        )
      })),

      deleteHabit: (id) => set((state) => ({
        habits: state.habits.filter(h => h.id !== id)
      })),

      addTodo: (task) => set((state) => ({
        todos: [...state.todos, { id: Date.now().toString(), task, completed: false }]
      })),

      toggleTodo: (id) => set((state) => ({
        todos: state.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      })),

      deleteTodo: (id) => set((state) => ({
        todos: state.todos.filter(t => t.id !== id)
      })),

      saveNote: (text) => set((state) => {
        if (!text.trim()) return state;
        const newNote = { id: Date.now().toString(), text, date: new Date().toLocaleDateString() };
        return { notes: [newNote, ...state.notes] };
      }),

      deleteNote: (id) => set((state) => ({
        notes: state.notes.filter(n => n.id !== id)
      })),

      // Progress Calculation Logic
      getProgress: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        
        const totalItems = state.habits.length + state.todos.length;
        if (totalItems === 0) return 0;

        const completedHabits = state.habits.filter(h => h.lastCompleted === today).length;
        const completedTodos = state.todos.filter(t => t.completed).length;
        
        return (completedHabits + completedTodos) / totalItems;
      }
    }),
    { name: 'focusflow-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);