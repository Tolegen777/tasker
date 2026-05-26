import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Meeting, MeetingWithRelations, Profile } from '@/types/db';

interface MeetingsState {
  meetings: MeetingWithRelations[];
  loaded: boolean;
  load: () => Promise<void>;
  subscribe: () => () => void;
  createMeeting: (payload: {
    title: string;
    description?: string | null;
    location?: string | null;
    starts_at: string;
    duration_minutes: number;
    created_by: string;
    participant_ids: string[];
  }) => Promise<void>;
  updateMeeting: (
    id: string,
    patch: {
      title?: string;
      description?: string | null;
      location?: string | null;
      starts_at?: string;
      duration_minutes?: number;
      participant_ids?: string[];
    }
  ) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
}

const SELECT =
  '*, author:profiles!meetings_created_by_fkey(*), participants:meeting_participants(profile:profiles(*))';

type RawMeeting = Meeting & {
  author: Profile | null;
  participants: { profile: Profile | null }[];
};

const normalize = (rows: RawMeeting[]): MeetingWithRelations[] =>
  rows.map((r) => ({
    ...r,
    participants: (r.participants ?? [])
      .map((p) => p.profile)
      .filter((p): p is Profile => Boolean(p)),
  }));

async function fetchOne(id: string): Promise<MeetingWithRelations | null> {
  const { data } = await supabase.from('meetings').select(SELECT).eq('id', id).single();
  if (!data) return null;
  return normalize([data as RawMeeting])[0] ?? null;
}

async function syncParticipants(meetingId: string, ids: string[]) {
  // Простой подход: чистим всех, вставляем новых.
  const { error: delErr } = await supabase
    .from('meeting_participants')
    .delete()
    .eq('meeting_id', meetingId);
  if (delErr) throw delErr;
  if (ids.length === 0) return;
  const rows = ids.map((profile_id) => ({ meeting_id: meetingId, profile_id }));
  const { error: insErr } = await supabase.from('meeting_participants').insert(rows);
  if (insErr) throw insErr;
}

export const useMeetingsStore = create<MeetingsState>((set, get) => ({
  meetings: [],
  loaded: false,

  load: async () => {
    const { data } = await supabase
      .from('meetings')
      .select(SELECT)
      .order('starts_at', { ascending: true });
    set({ meetings: normalize((data ?? []) as RawMeeting[]), loaded: true });
  },

  subscribe: () => {
    const refreshOne = async (id: string) => {
      const row = await fetchOne(id);
      if (!row) return;
      const list = get().meetings;
      const exists = list.find((m) => m.id === id);
      set({
        meetings: exists ? list.map((m) => (m.id === id ? row : m)) : [...list, row],
      });
    };

    const ch = supabase
      .channel('meetings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, async (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as Meeting).id;
          set({ meetings: get().meetings.filter((m) => m.id !== id) });
          return;
        }
        await refreshOne((payload.new as Meeting).id);
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meeting_participants' },
        async (payload) => {
          const id =
            (payload.new as { meeting_id?: string } | null)?.meeting_id ??
            (payload.old as { meeting_id?: string } | null)?.meeting_id;
          if (id) await refreshOne(id);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  },

  createMeeting: async (payload) => {
    const { data, error } = await supabase
      .from('meetings')
      .insert({
        title: payload.title,
        description: payload.description ?? null,
        location: payload.location ?? null,
        starts_at: payload.starts_at,
        duration_minutes: payload.duration_minutes,
        created_by: payload.created_by,
      })
      .select('id')
      .single();
    if (error) throw error;
    if (data?.id) await syncParticipants(data.id, payload.participant_ids);
  },

  updateMeeting: async (id, patch) => {
    const { participant_ids, ...rest } = patch;
    if (Object.keys(rest).length > 0) {
      const { error } = await supabase.from('meetings').update(rest).eq('id', id);
      if (error) throw error;
    }
    if (participant_ids) await syncParticipants(id, participant_ids);
  },

  deleteMeeting: async (id) => {
    const { error } = await supabase.from('meetings').delete().eq('id', id);
    if (error) throw error;
  },
}));
