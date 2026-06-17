import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useSite } from '../../lib/site.jsx';
import Title from '../../components/Title.jsx';

const initial = {
  applicant_name: '', parent_name: '', email: '', phone: '',
  applying_class_id: '', date_of_birth: '', previous_school: '',
  address: '', notes: '',
};

export default function AdmissionsPage() {
  const { settings } = useSite();
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { api('/api/public/classes').then(d => setClasses(d.items)); }, []);

  function update(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await api('/api/public/admissions/apply', { method: 'POST', body: { ...form, applying_class_id: Number(form.applying_class_id) } });
      setSubmitted({ id: r.id, name: form.applicant_name });
      setForm(initial);
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Title>Admissions</Title>
      <section className="bg-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold">Admissions</h1>
          <p className="text-brand-100 mt-2 max-w-2xl">
            Applications for the next academic session are {settings.admissions_open ? 'open' : 'currently closed'}.
            Submit the form below and our admissions office will get back to you within 3 working days.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {submitted ? (
            <div className="card">
              <div className="card-body">
                <h2 className="text-xl font-semibold text-emerald-700">Application received ✓</h2>
                <p className="mt-2 text-slate-700">
                  Thanks, <strong>{submitted.name}</strong>. Your application has been logged with reference
                  number <code className="bg-slate-100 px-2 py-0.5 rounded">#{submitted.id}</code>.
                  Our admissions team will contact you at the email or phone you provided.
                </p>
                <button onClick={() => setSubmitted(null)} className="btn-secondary mt-4">
                  Submit another application
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="card">
              <div className="card-body space-y-3">
                <h2 className="text-xl font-semibold">Online application form</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="an">Applicant name *</label>
                    <input id="an" className="input" required value={form.applicant_name} onChange={e => update('applicant_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="pn">Parent / guardian name *</label>
                    <input id="pn" className="input" required value={form.parent_name} onChange={e => update('parent_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="em">Email *</label>
                    <input id="em" type="email" className="input" required value={form.email} onChange={e => update('email', e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="ph">Phone *</label>
                    <input id="ph" type="tel" className="input" required value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+92…" />
                  </div>
                  <div>
                    <label className="label" htmlFor="cl">Applying for class *</label>
                    <select id="cl" className="input" required value={form.applying_class_id} onChange={e => update('applying_class_id', e.target.value)}>
                      <option value="">Select…</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="dob">Date of birth</label>
                    <input id="dob" type="date" className="input" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="ps">Previous school (if any)</label>
                    <input id="ps" className="input" value={form.previous_school} onChange={e => update('previous_school', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="ad">Address</label>
                    <input id="ad" className="input" value={form.address} onChange={e => update('address', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="nt">Notes (medical, special needs, etc.)</label>
                    <textarea id="nt" rows={3} className="input" value={form.notes} onChange={e => update('notes', e.target.value)} />
                  </div>
                </div>
                {error && <div className="text-sm text-red-600">Could not submit: {error}</div>}
                <button className="btn-primary" disabled={submitting || !settings.admissions_open}>
                  {submitting ? 'Submitting…' : 'Submit application'}
                </button>
                {!settings.admissions_open && (
                  <p className="text-sm text-slate-500">Admissions are currently closed. Please check back later.</p>
                )}
              </div>
            </form>
          )}
        </div>

        <aside>
          <div className="card">
            <div className="card-body space-y-3 text-sm">
              <h3 className="font-semibold text-base">What happens next?</h3>
              <ol className="list-decimal pl-5 space-y-2 text-slate-700">
                <li>You submit the application (this form).</li>
                <li>Admissions office reviews and contacts you within 3 working days.</li>
                <li>If shortlisted, you are invited for an in-person meeting and campus tour.</li>
                <li>On acceptance, you receive the fee challan and joining instructions.</li>
              </ol>
              <h3 className="font-semibold pt-2">Required documents</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>Birth certificate (original + copy)</li>
                <li>Two recent passport-size photographs</li>
                <li>Previous school transcripts (if applicable)</li>
                <li>Parent / guardian CNIC copy</li>
              </ul>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
