import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';

const STATUSES = ['present','absent','late','leave','holiday'];

export default function TeacherAttendancePage() {
  const [me, setMe] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ date: new Date().toISOString().slice(0,10), class_id: '', section_id: '' });
  const [marks, setMarks] = useState({});          // { student_id: status }
  const [remarks, setRemarks] = useState({});        // { student_id: remarks }
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api('/api/teacher/dashboard').then(setMe).finally(() => setLoading(false));
  }, []);

  async function loadRoster() {
    if (!filter.class_id || !filter.section_id || !filter.date) return;
    setLoading(true); setSaved(false); setError(null);
    try {
      const r = await api(`/api/teacher/attendance?class_id=${filter.class_id}&section_id=${filter.section_id}&date=${filter.date}`);
      setRoster(r.items);
      const init = {}, initR = {};
      for (const s of r.items) {
        init[s.student_id] = s.status || 'present';
        initR[s.student_id] = s.remarks || '';
      }
      setMarks(init);
      setRemarks(initR);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function bulk(status) { const all = {}; roster.forEach(s => { all[s.student_id] = status; }); setMarks(all); }

  async function saveAll() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const payload = {
        class_id: Number(filter.class_id),
        section_id: Number(filter.section_id),
        date: filter.date,
        marks: roster.map(s => ({ student_id: s.student_id, status: marks[s.student_id] || 'present', remarks: remarks[s.student_id] || undefined })),
      };
      await api('/api/teacher/attendance', { method: 'POST', body: payload });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSaving(false); }
  }

  const assignment = me?.assignments?.find(a => String(a.class_id) === String(filter.class_id) && String(a.section_id) === String(filter.section_id));
  const classOptions = [...new Map((me?.assignments || []).map(a => [a.class_id, a])).values()];
  const sectionOptions = (me?.assignments || []).filter(a => String(a.class_id) === String(filter.class_id));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Mark attendance</h1>
        <p className="text-slate-500">Pick a date and one of your assigned classes.</p>
      </header>

      <div className="card">
        <div className="card-body grid sm:grid-cols-4 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={filter.date} onChange={e => setFilter({ ...filter, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Class</label>
            <select className="input" value={filter.class_id} onChange={e => setFilter({ ...filter, class_id: e.target.value, section_id: '' })}>
              <option value="">Select…</option>
              {classOptions.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <select className="input" value={filter.section_id} onChange={e => setFilter({ ...filter, section_id: e.target.value })} disabled={!filter.class_id}>
              <option value="">Select…</option>
              {sectionOptions.map(s => <option key={s.section_id} value={s.section_id}>{s.section}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={loadRoster} disabled={!filter.class_id || !filter.section_id} className="btn-primary w-full">Load roster</button>
          </div>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {saved && <div className="text-sm text-emerald-700">✓ Attendance saved.</div>}

      {roster.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Bulk:</span>
            {STATUSES.map(s => (
              <button key={s} onClick={() => bulk(s)} className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 capitalize">{s}</button>
            ))}
          </div>
          {assignment && <p className="text-xs text-slate-500">Showing roster for <strong>{assignment.subject}</strong> · {assignment.class_name}/{assignment.section} · {assignment.session_name}</p>}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
                <tr><th className="px-3 py-2">Adm #</th><th>Name</th><th>Status</th><th>Remarks</th></tr>
              </thead>
              <tbody>
                {roster.map(s => (
                  <tr key={s.student_id} className="border-t border-slate-200">
                    <td className="px-3 py-2 font-mono text-xs">{s.admission_no}</td>
                    <td className="px-3 py-2 font-medium">{s.full_name}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {STATUSES.map(st => (
                          <button key={st} onClick={() => setMarks(m => ({ ...m, [s.student_id]: st }))}
                            className={'px-2 py-1 rounded text-xs border ' + (
                              marks[s.student_id] === st
                                ? (st === 'present' ? 'bg-emerald-600 text-white border-emerald-600'
                                  : st === 'absent'  ? 'bg-red-600 text-white border-red-600'
                                  : st === 'late'    ? 'bg-amber-600 text-white border-amber-600'
                                  : st === 'leave'   ? 'bg-brand-600 text-white border-brand-600'
                                                        : 'bg-slate-700 text-white border-slate-700')
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            )}>
                            {st}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input className="input !py-1 text-xs" value={remarks[s.student_id] || ''} onChange={e => setRemarks(r => ({ ...r, [s.student_id]: e.target.value }))} placeholder="optional" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button onClick={saveAll} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save attendance'}</button>
          </div>
        </>
      )}
    </div>
  );
}
