// Teacher API — typed views of the existing /api/teacher/* +
// /api/teacher-attendance/* routes. LMS endpoints (lectures,
// assignments, quizzes, live-classes) are reused from the student
// wrappers above — same shape on the wire.
import { api } from './client';

export interface TeacherAssignment {
  id: number;
  class_id: number;
  section_id: number;
  subject_id: number;
  class_name: string;
  section_name: string;
  subject_name: string;
}

export interface TeacherDashboard {
  greeting: string;
  teacher: { employee_code?: string; designation?: string };
  assignments?: TeacherAssignment[];
  today?: {
    live_classes?: any[];
    pending_grading?: number;
    attendance_marked?: boolean;
  };
  counts?: {
    students?: number;
    subjects?: number;
    lectures?: number;
  };
}

export interface RosterStudent {
  student_id: number;
  full_name: string;
  admission_no: string;
  roll_no?: number | null;
}

export interface AttendanceMarkPayload {
  class_id: number;
  section_id: number;
  date: string;             // YYYY-MM-DD
  entries: Array<{ student_id: number; status: 'present' | 'absent' | 'late' | 'leave'; remarks?: string }>;
}

export interface AttendanceMarkResult {
  marked: number;
  updated: number;
}

export interface BulkResultPayload {
  class_id: number;
  section_id: number;
  subject_id: number;
  term_id: number;
  session_id: number;
  total_marks: number;
  rows: Array<{ student_id: number; marks_obtained: number; grade?: string }>;
}

export interface RemarkPayload {
  student_id: number;
  body: string;
  category?: 'general' | 'praise' | 'concern' | 'academic';
  visibility?: 'parent' | 'internal';
}

export interface TeacherSelfAttendanceToday {
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave' | 'holiday' | null;
  check_in?: string | null;
  check_out?: string | null;
}

export const teacherApi = {
  dashboard:        async () => (await api.get('/api/teacher/dashboard')).data as TeacherDashboard,
  roster:           async (classId: number, sectionId: number) =>
    (await api.get('/api/teacher/roster', { params: { class_id: classId, section_id: sectionId } })).data as { items: RosterStudent[] },
  subjects:         async () => (await api.get('/api/teacher/subjects')).data as { items: TeacherAssignment[] },

  markAttendance:   async (payload: AttendanceMarkPayload) =>
    (await api.post('/api/teacher/attendance', payload)).data as AttendanceMarkResult,

  uploadBulkResults:async (payload: BulkResultPayload) =>
    (await api.post('/api/teacher/results', payload)).data,

  listRemarks:      async (params?: { student_id?: number }) =>
    (await api.get('/api/teacher/remarks', { params })).data as { items: any[] },
  addRemark:        async (payload: RemarkPayload) =>
    (await api.post('/api/teacher/remarks', payload)).data,

  selfToday:        async () => (await api.get('/api/teacher-attendance/today')).data as TeacherSelfAttendanceToday,
  selfHistory:      async (params?: { from?: string; to?: string }) =>
    (await api.get('/api/teacher-attendance/history', { params })).data as { items: any[] },
  selfCheckIn:      async () => (await api.post('/api/teacher-attendance/checkin', {})).data,
  selfCheckOut:     async () => (await api.post('/api/teacher-attendance/checkout', {})).data,
};
