import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';

const initial = { full_name: '', email: '', phone: '', cnic: '', experience: '', cover_letter: '' };

export default function JobDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api(`/api/public/jobs/${id}`).then(d => setJob(d.item)).catch(e => setError(e.data?.error || e.message));
  }, [id]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api('/api/public/jobs/apply', { method: 'POST', body: { ...form, position: job.title } });
      setSubmitted(true);
      setForm(initial);
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Position not found</h1>
      <Link to="/careers" className="btn-primary mt-4 inline-flex">Back to Careers</Link>
    </div>
  );
  if (!job) return <div className="max-w-3xl mx-auto px-4 py-16 text-slate-500">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link to="/careers" className="text-sm text-brand-700">← All open positions</Link>
      <h1 className="text-3xl font-bold mt-2">{job.title}</h1>
      <p className="text-slate-500 mt-1">
        {job.department}{job.department && job.location && ' · '}{job.location}
        {job.apply_deadline && ' · Apply by ' + new Date(job.apply_deadline).toLocaleDateString()}
      </p>

      <div className="grid lg:grid-cols-3 gap-8 mt-6">
        <div className="lg:col-span-2 space-y-5">
          <section>
            <h2 className="text-lg font-semibold">Role</h2>
            <p className="text-slate-700 mt-2 whitespace-pre-line">{job.description}</p>
          </section>
          {job.requirements && (
            <section>
              <h2 className="text-lg font-semibold">Requirements</h2>
              <p className="text-slate-700 mt-2 whitespace-pre-line">{job.requirements}</p>
            </section>
          )}
          {job.salary_range && (
            <section>
              <h2 className="text-lg font-semibold">Compensation</h2>
              <p className="text-slate-700 mt-2">{job.salary_range}</p>
            </section>
          )}
        </div>

        <aside>
          <form onSubmit={onSubmit} className="card sticky top-20">
            <div className="card-body space-y-3">
              <h3 className="font-semibold">Apply for this position</h3>
              {submitted ? (
                <div className="text-emerald-700 text-sm">✓ Your application has been submitted. HR will reach out if shortlisted.</div>
              ) : (
                <>
                  <div>
                    <label className="label">Full name *</label>
                    <input className="input" required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Email *</label>
                    <input type="email" required className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Phone *</label>
                    <input type="tel" required className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">CNIC</label>
                    <input className="input" value={form.cnic} onChange={e => setForm({...form, cnic: e.target.value})} placeholder="00000-0000000-0" />
                  </div>
                  <div>
                    <label className="label">Experience</label>
                    <input className="input" value={form.experience} onChange={e => setForm({...form, experience: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Cover letter</label>
                    <textarea rows={4} className="input" value={form.cover_letter} onChange={e => setForm({...form, cover_letter: e.target.value})} />
                  </div>
                  {error && <div className="text-sm text-red-600">Could not submit: {error}</div>}
                  <button className="btn-primary w-full" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit application'}</button>
                </>
              )}
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
