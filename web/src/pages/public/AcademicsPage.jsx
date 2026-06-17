import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function AcademicsPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api('/api/public/classes').then(d => setClasses(d.items)).finally(() => setLoading(false));
  }, []);
  return (
    <div>
      <section className="bg-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold">Academics</h1>
          <p className="text-brand-100 mt-2 max-w-2xl">Our curriculum follows the national syllabus and is structured across primary and secondary levels.</p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6">Grade levels</h2>
        {loading ? <p className="text-slate-500">Loading…</p> : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {classes.map(c => (
              <div key={c.id} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{c.name}</h3>
                    <span className="text-xs text-slate-500">Level {c.level}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    English, Mathematics, Science, Social Studies, Urdu, and Computer.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <h3 className="font-semibold text-slate-800">Curriculum</h3>
            <p className="text-slate-600 mt-1">Federal / provincial board syllabus with supplementary reading in English and Urdu literature.</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Assessment</h3>
            <p className="text-slate-600 mt-1">Continuous assessment through class work, term exams, and a final examination at the end of the academic session.</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Beyond the classroom</h3>
            <p className="text-slate-600 mt-1">Debate, arts, sports, computer club, community service, and annual science fair.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
