import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Profile, Task, TaskStatus, TaskWithRelations } from '@/types/db';

interface TasksState {
  tasks: TaskWithRelations[];
  profiles: Profile[];
  loaded: boolean;
  load: () => Promise<void>;
  subscribe: () => () => void;
  upsertLocal: (t: Task) => void;
  removeLocal: (id: string) => void;
  createTask: (payload: Partial<Task> & { title: string; created_by: string }) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

const PROFILES_SELECT = '*';
const TASKS_SELECT =
  '*, assignee:profiles!tasks_assignee_id_fkey(*), author:profiles!tasks_created_by_fkey(*)';

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  profiles: [],
  loaded: false,

  load: async () => {
    const [tRes, pRes] = await Promise.all([
      supabase.from('tasks').select(TASKS_SELECT).order('position', { ascending: true }),
      supabase.from('profiles').select(PROFILES_SELECT).order('full_name'),
    ]);
    set({
      tasks: (tRes.data ?? []) as TaskWithRelations[],
      profiles: (pRes.data ?? []) as Profile[],
      loaded: true,
    });
  },

  subscribe: () => {
    const ch = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async (payload) => {
        if (payload.eventType === 'DELETE') {
          get().removeLocal((payload.old as Task).id);
          return;
        }
        const id = (payload.new as Task).id;
        const { data } = await supabase.from('tasks').select(TASKS_SELECT).eq('id', id).single();
        if (data) {
          const row = data as TaskWithRelations;
          const existing = get().tasks.find((t) => t.id === row.id);
          set({
            tasks: existing
              ? get().tasks.map((t) => (t.id === row.id ? row : t))
              : [...get().tasks, row],
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
        const { data } = await supabase.from('profiles').select(PROFILES_SELECT).order('full_name');
        set({ profiles: (data ?? []) as Profile[] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  },

  upsertLocal: (t) => {
    const existing = get().tasks.find((x) => x.id === t.id);
    set({
      tasks: existing
        ? get().tasks.map((x) => (x.id === t.id ? { ...x, ...t } : x))
        : get().tasks,
    });
  },
  removeLocal: (id) => set({ tasks: get().tasks.filter((t) => t.id !== id) }),

  createTask: async (payload) => {
    const status = (payload.status ?? 'todo') as TaskStatus;
    const maxPos = Math.max(
      0,
      ...get()
        .tasks.filter((t) => t.status === status)
        .map((t) => t.position)
    );
    const { error } = await supabase.from('tasks').insert({
      title: payload.title,
      description: payload.description ?? null,
      status,
      priority: payload.priority ?? 'medium',
      assignee_id: payload.assignee_id ?? null,
      due_date: payload.due_date ?? null,
      created_by: payload.created_by,
      position: maxPos + 1,
    });
    if (error) throw error;
  },

  updateTask: async (id, patch) => {
    const { error } = await supabase.from('tasks').update(patch).eq('id', id);
    if (error) throw error;
  },

  deleteTask: async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  },
}));
