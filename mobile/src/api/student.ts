// Student API wrappers — typed views of the existing /api/student/* routes.
import { api } from './client';

export interface StudentDashboard {
  greeting: string;
  class_name?: string;
  section_name?: string;
  session_name?: string;
  admission_no?: string;
  attendance?: { attendance_pct?: number; counted?: number };
  live_classes?: any[];
  pending_assignments?: any[];
  fees?: { unpaid_count?: number; unpaid_total?: number | string };
}

export interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave' | 'holiday';
  remarks?: string | null;
}

export interface ResultSubject {
  name: string;
  total_marks: number;
  marks_obtained: number;
  grade?: string;
}

export interface AssignmentRow {
  id: number;
  title: string;
  description?: string;
  subject_id: number;
  class_id: number;
  section_id: number;
  session_id: number;
  due_at: string;
  total_marks?: number;
  submitted?: 0 | 1;
  submission_id?: number;
}

export interface QuizRow {
  id: number;
  title: string;
  total_marks?: number;
  available_from: string;
  available_to: string;
  attempted?: 0 | 1;
}

export interface LiveClassRow {
  id: number;
  title: string;
  subject_name?: string;
  class_name?: string;
  section_name?: string;
  teacher_name?: string;
  starts_at: string;
  ends_at?: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  jitsi_room: string;
}

export const studentApi = {
  dashboard: async () => (await api.get('/api/student/dashboard')).data as StudentDashboard,
  attendance: async () => (await api.get('/api/student/attendance')).data as { records: AttendanceRecord[] },
  results:    async () => (await api.get('/api/student/results')).data    as { subjects: ResultSubject[] },
  assignments:async () => (await api.get('/api/student/assignments')).data as { items: AssignmentRow[] },
  quizzes:    async () => (await api.get('/api/student/quizzes')).data    as { items: QuizRow[] },
  liveClasses:async () => (await api.get('/api/student/live-classes')).data as { items: LiveClassRow[] },

  // Submit an assignment (file_url is the remote URL after upload)
  submitAssignment: async (assignmentId: number, payload: { file_url?: string; notes?: string }) =>
    (await api.post(`/api/student/assignments/${assignmentId}/submit`, payload)).data,

  // Start a quiz attempt
  startQuizAttempt: async (quizId: number) =>
    (await api.post(`/api/student/quizzes/${quizId}/attempt`, {})).data,

  // Mark a notification as read
  markNotificationRead: async (id: number) =>
    (await api.post(`/api/notifications/${id}/read`, {})).data,
};
