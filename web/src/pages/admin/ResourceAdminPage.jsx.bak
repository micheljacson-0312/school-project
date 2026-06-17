import SimpleResourcePage from './SessionsPage';

const FIELDS = [
  { name: 'name',       label: 'Session name', type: 'string', required: true, render: v => <span className="font-medium">{v}</span> },
  { name: 'start_date', label: 'Start date',   type: 'date',   required: true },
  { name: 'end_date',   label: 'End date',     type: 'date',   required: true },
  { name: 'is_current', label: 'Current',      type: 'bool' },
];

export default function SessionsPage() {
  return <SimpleResourcePage title="Academic sessions" endpoint="/api/admin/academic/sessions" fields={FIELDS} />;
}
