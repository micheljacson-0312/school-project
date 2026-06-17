// Challan preview page — fetches a fee_collection by id and renders a
// PDF-ready template. The operator can later print from this view.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';

export default function ChallanPreviewPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api(`/api/accountant/challan/${id}`).then(d => setData(d.challan)).catch(e => setError(e.message));
  }, [id]);
  if (error) return <div className="card"><div className="card-body text-red-700">{error}</div></div>;
  if (!data) return <p className="text-slate-500">Loading…</p>;
  const net = Number(data.net_amount);
  const paid = Number(data.paid_amount);
  const outstanding = net - paid;
  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Challan #{data.challan_no}</h1>
        <button onClick={() => window.print()} className="btn-secondary text-sm no-print">Print</button>
      </header>

      <div className="card print:shadow-none print:border-0">
        <div className="card-body">
          <header className="flex items-start justify-between border-b border-slate-200 pb-4 mb-4">
            <div>
              <div className="text-xl font-bold">School Platform</div>
              <div className="text-xs text-slate-500">123 Education Road · info@school.test · +92-21-1234567</div>
            </div>
            <div className="text-right text-sm">
              <div className="font-mono text-base">Challan #{data.challan_no}</div>
              <div>Due: <strong>{data.due_date?.slice(0,10)}</strong></div>
            </div>
          </header>

          <section className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase text-slate-500">Student</div>
              <div className="font-semibold text-base">{data.student_name}</div>
              <div>Adm. #{data.admission_no} · Roll {data.roll_no || '—'}</div>
              <div>Class {data.class_name} · Section {data.section_name}</div>
              <div>Session {data.session_name}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500">Guardian</div>
              <div>{data.guardian_name || '—'}</div>
              <div>{data.guardian_phone || '—'}</div>
            </div>
          </section>

          <hr className="my-4 border-slate-200" />

          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
              <tr><th className="px-3 py-2">Description</th><th className="px-3 py-2 text-right">Amount</th></tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{data.structure_name}</td>
                <td className="px-3 py-2 text-right">PKR {Number(data.amount).toLocaleString()}</td>
              </tr>
              {Number(data.discount_amount) > 0 && (
                <tr className="border-t border-slate-200">
                  <td className="px-3 py-2 text-slate-600">Discount applied</td>
                  <td className="px-3 py-2 text-right text-slate-600">− PKR {Number(data.discount_amount).toLocaleString()}</td>
                </tr>
              )}
              <tr className="border-t border-slate-300 bg-slate-50">
                <td className="px-3 py-2 font-bold">Net amount</td>
                <td className="px-3 py-2 text-right font-bold">PKR {net.toLocaleString()}</td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="px-3 py-2 text-emerald-700">Paid</td>
                <td className="px-3 py-2 text-right text-emerald-700">PKR {paid.toLocaleString()}</td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="px-3 py-2 font-semibold text-red-700">Outstanding</td>
                <td className="px-3 py-2 text-right font-semibold text-red-700">PKR {outstanding.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          {data.notes && (
            <p className="mt-4 text-xs text-slate-500">Notes: {data.notes}</p>
          )}

          <footer className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-500 text-center">
            Please retain this challan for your records. Payable at the school office.
          </footer>
        </div>
      </div>
    </div>
  );
}
