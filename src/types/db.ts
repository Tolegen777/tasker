export type Role = 'admin' | 'employee';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  created_by: string;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskWithRelations extends Task {
  assignee: Profile | null;
  author: Profile | null;
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Нужно сделать',
  in_progress: 'В процессе',
  done: 'Завершено',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочно',
};

export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'gray',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Администратор',
  employee: 'Сотрудник',
};

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string; // timestamptz ISO
  duration_minutes: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingWithRelations extends Meeting {
  author: Profile | null;
  participants: Profile[];
}

export const DURATION_PRESETS: { value: number; label: string }[] = [
  { value: 15, label: '15 минут' },
  { value: 30, label: '30 минут' },
  { value: 45, label: '45 минут' },
  { value: 60, label: '1 час' },
  { value: 90, label: '1.5 часа' },
  { value: 120, label: '2 часа' },
  { value: 180, label: '3 часа' },
];
