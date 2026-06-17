import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';

const ROLE_OPTIONS = [
  { value: 'admin',       label: 'Administrator' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'teacher',     label: 'Teacher' },
  { value: 'student',     label: 'Student' },
  { value: 'parent',      label: 'Parent' },
  { value: 'accountant',  label: 'Accountant' },
  { value: 'operator',    label: 'Computer Operator' },
  { value: 'alumni',      label: 'Alumni' },
];

const STATUSES = ['active','inactive','pending','suspended'];

const blank = { email:'', full_name:'', role_key:'student', phone:'', cnic:'', status:'active', password:'' };

export default function UserFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [profile, setProfile] = useState({});
  const [options, setOptions] = useState({ classes: [], sections: [], subjects: [], sessions: [] });
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Always load option lists for the profile form
    Promise.all([
      api('/api/admin/academic/classes'),
      api('/api/admin/academic/sessions'),
    ]).then(([cls, sess]) => {
      setOptions(o => ({ ...o, classes: cls.items, sessions: sess.items }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api(`/api/admin/users/${id}`).then(d => {
      const u = d.item;
      setForm({
        email: u.email,
        full_name: u.full_name,
        role_key: u.role_key,
        phone: u.phone || '',
        cnic: u.cnic || '',
        status: u.status,
        password: '',
      });
      if (u.student_profile) setProfile({ ...u.student_profile });
      else if (u.teacher_profile) setProfile({ ...u.teacher_profile });
      else if (u.parent_profile) setProfile({ ...u.parent_profile });
      else if (u.staff_profile) setProfile({ ...u.staff_profile });
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id, isEdit]);

  // Load sections + subjects for the selected class
  useEffect(() => {
    if (!profile.class_id) return;
    Promise.all([
      api(`/api/admin/academic/sections`),
      api(`/api/admin/academic/subjects`),
    ]).then(([sec, sub]) => {
      setOptions(o => ({ ...o, sections: sec.items.filter(s => String(s.class_id) === String(profile.class_id)),
                                    subjects: sub.items.filter(s => String(s.class_id) === String(profile.class_id)) }));
    }).catch(() => {});
  }, [profile.class_id]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function setP(k, v) { setProfile(p => ({ ...p, [k]: v })); }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        const body = { email: form.email, full_name: form.full_name, phone: form.phone, cnic: form.cnic, status: form.status, role_key: form.role_key };
        if (form.password) body.password = form.password;
        await api(`/api/admin/users/${id}`, { method: 'PUT', body });
      } else {
        const body = { ...form };
        if (form.role_key === 'student') {
          body.profile = { admission_no: profile.admission_no, class_id: Number(profile.class_id), section_id: Number(profile.section_id),
                           session_id: Number(profile.session_id), roll_no: profile.roll_no, gender: profile.gender,
                           date_of_birth: profile.date_of_birth, guardian_name: profile.guardian_name, guardian_phone: profile.guardian_phone };
        } else if (form.role_key === 'teacher') {
          body.profile = { employee_code: profile.employee_code, designation: profile.designation, qualification: profile.qualification, joining_date: profile.joining_date };
        } else if (form.role_key === 'parent') {
          body.profile = { occupation: profile.occupation, address: profile.address };
        } else if (['coordinator','accountant','operator'].includes(form.role_key)) {
          body.profile = { employee_code: profile.employee_code, department: profile.department, designation: profile.designation, joining_date: profile.joining_date };
        }
        await api('/api/admin/users', { method: 'POST', body });
      }
      navigate('/admin/users', { replace: true });
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold">{isEdit ? 'Edit user' : 'New user'}</h1>
        <p className="text-slate-500">All fields except the role-specific profile are required.</p>
      </header>
      <form onSubmit={onSubmit} className="card">
        <div className="card-body space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Full name *</label>
              <input className="input" required value={form.full_name} onChange={e => set('full_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Role *</label>
              <select className="input" value={form.role_key} disabled={isEdit} onChange={e => set('role_key', e.target.value)}>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              {isEdit && <p className="text-xs text-slate-500 mt-1">Role cannot be changed from this screen.</p>}
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" required className="input" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="label">CNIC</label>
              <input className="input" value={form.cnic} onChange={e => set('cnic', e.target.value)} placeholder="00000-0000000-0" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">{isEdit ? 'Reset password (leave blank to keep)' : 'Initial password *'}</label>
              <input type="password" className="input" required={!isEdit} minLength={8}
                     value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
          </div>

          {/* Role-specific profile extension */}
          {form.role_key === 'student' && (
            <fieldset className="border-t border-slate-200 pt-4">
              <legend className="text-sm font-semibold text-slate-700 px-2">Student profile</legend>
              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="label">Admission number *</label>
                  <input required className="input" value={profile.admission_no || ''} onChange={e => setP('admission_no', e.target.value)} />
                </div>
                <div>
                  <label className="label">Roll number</label>
                  <input className="input" value={profile.roll_no || ''} onChange={e => setP('roll_no', e.target.value)} />
                </div>
                <div>
                  <label className="label">Session *</label>
                  <select required className="input" value={profile.session_id || ''} onChange={e => setP('session_id', e.target.value)}>
                    <option value="">Select…</option>
                    {options.sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Class *</label>
                  <select required className="input" value={profile.class_id || ''} onChange={e => setP('class_id', e.target.value)}>
                    <option value="">Select…</option>
                    {options.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Section *</label>
                  <select required className="input" value={profile.section_id || ''} onChange={e => setP('section_id', e.target.value)} disabled={!profile.class_id}>
                    <option value="">Select…</option>
                    {options.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select className="input" value={profile.gender || ''} onChange={e => setP('gender', e.target.value)}>
                    <option value="">—</option>
                    <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Date of birth</label>
                  <input type="date" className="input" value={profile.date_of_birth || ''} onChange={e => setP('date_of_birth', e.target.value)} />
                </div>
                <div>
                  <label className="label">Guardian name</label>
                  <input className="input" value={profile.guardian_name || ''} onChange={e => setP('guardian_name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Guardian phone</label>
                  <input className="input" value={profile.guardian_phone || ''} onChange={e => setP('guardian_phone', e.target.value)} />
                </div>
              </div>
            </fieldset>
          )}

          {form.role_key === 'teacher' && (
            <fieldset className="border-t border-slate-200 pt-4">
              <legend className="text-sm font-semibold text-slate-700 px-2">Teacher profile</legend>
              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="label">Employee code *</label>
                  <input required className="input" value={profile.employee_code || ''} onChange={e => setP('employee_code', e.target.value)} />
                </div>
                <div>
                  <label className="label">Designation</label>
                  <input className="input" value={profile.designation || ''} onChange={e => setP('designation', e.target.value)} />
                </div>
                <div>
                  <label className="label">Qualification</label>
                  <input className="input" value={profile.qualification || ''} onChange={e => setP('qualification', e.target.value)} />
                </div>
                <div>
                  <label className="label">Joining date</label>
                  <input type="date" className="input" value={profile.joining_date || ''} onChange={e => setP('joining_date', e.target.value)} />
                </div>
              </div>
            </fieldset>
          )}

          {form.role_key === 'parent' && (
            <fieldset className="border-t border-slate-200 pt-4">
              <legend className="text-sm font-semibold text-slate-700 px-2">Parent profile</legend>
              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="label">Occupation</label>
                  <input className="input" value={profile.occupation || ''} onChange={e => setP('occupation', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Address</label>
                  <input className="input" value={profile.address || ''} onChange={e => setP('address', e.target.value)} />
                </div>
              </div>
            </fieldset>
          )}

          {['coordinator','accountant','operator'].includes(form.role_key) && (
            <fieldset className="border-t border-slate-200 pt-4">
              <legend className="text-sm font-semibold text-slate-700 px-2">Staff profile</legend>
              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="label">Employee code *</label>
                  <input required className="input" value={profile.employee_code || ''} onChange={e => setP('employee_code', e.target.value)} />
                </div>
                <div>
                  <label className="label">Department</label>
                  <input className="input" value={profile.department || ''} onChange={e => setP('department', e.target.value)} />
                </div>
                <div>
                  <label className="label">Designation</label>
                  <input className="input" value={profile.designation || ''} onChange={e => setP('designation', e.target.value)} />
                </div>
                <div>
                  <label className="label">Joining date</label>
                  <input type="date" className="input" value={profile.joining_date || ''} onChange={e => setP('joining_date', e.target.value)} />
                </div>
              </div>
            </fieldset>
          )}

          {error && <div className="text-sm text-red-600">Could not save: {error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => navigate('/admin/users')}>Cancel</button>
            <button className="btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Save user'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
