import ResourceAdminPage from './ResourceAdminPage.jsx';

const FIELDS = [
  { name: 'name',  label: 'Class name', type: 'string', required: true, render: v => <span className="font-medium">{v}</span> },
  { name: 'level', label: 'Level',      type: 'number', required: true, coerce: 'int' },
];

export default function ClassesPage() {
  return <ResourceAdminPage title="Classes" endpoint="/api/admin/academic/classes" fields={FIELDS} />;
}
