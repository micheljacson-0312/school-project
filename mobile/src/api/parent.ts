// Parent API — typed views of the existing /api/parent/* routes.
// Children are linked via parent_student in the DB; the backend
// resolves them for the current logged-in parent.
import { api } from './client';

export interface ParentChild {
  student_id: number;
  student_name: string;
  admission_no: string;
  class_name: string;
  section_name: string;
  session_name: string;
  roll_no?: number | null;
  attendance?: { attendance_pct?: number | null; counted?: number | null };
  fees?: { unpaid_total?: number | string | null; unpaid_count?: number | null };
  results_pct?: number | null;
}

export interface ParentDashboard {
  greeting: string;
  children: ParentChild[];
}

export interface ChildAttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave' | 'holiday';
  remarks?: string | null;
}

export interface ChildResultSubject {
  name: string;
  total_marks: number;
  marks_obtained: number;
  grade?: string;
}

export interface ChildFeeRow {
  id: number;
  structure_name: string;
  net_amount: number;
  paid_amount: number;
  outstanding: number;
  due_date: string;
  status: string;
  challan_no?: string | null;
}

export interface ChildFees {
  unpaid_count: number;
  paid_count: number;
  total_outstanding: number;
  total_paid: number;
  items: ChildFeeRow[];
}

export interface EvaluationForm {
  id: number;
  title: string;
  description?: string | null;
  target_audience?: string;
  is_active: 0 | 1;
  deadline?: string | null;
  responded?: 0 | 1;
}

export const parentApi = {
  dashboard:  async () => (await api.get('/api/parent/dashboard')).data as ParentDashboard,
  childAttendance: async (studentId: number) =>
    (await api.get(`/api/parent/children/${studentId}/attendance`)).data as { records: ChildAttendanceRecord[] },
  childResults:    async (studentId: number) =>
    (await api.get(`/api/parent/children/${studentId}/results`)).data    as { subjects: ChildResultSubject[] },
  childFees:       async (studentId: number) =>
    (await api.get(`/api/parent/children/${studentId}/fees`)).data       as ChildFees,
  evaluations:    async () =>
    (await api.get('/api/parent/evaluations')).data as { items: EvaluationForm[] },
  submitEvaluation: async (formId: number, payload: Record<string, any>) =>
    (await api.post(`/api/parent/evaluations/${formId}/respond`, { answers: payload })).data,
};
