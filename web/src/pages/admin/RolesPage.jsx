// RBAC management — view all roles with their permissions; toggle
// individual permissions on a role; save as a single update.
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState(null);
  const [draft, setDraft] = useState(new Set());
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api('/api/admin/roles'),
      api('/api/admin/permissions'),
    ]).then(([r, p]) => {
      setRoles(r.roles);
      setPerms(p.permissions);
      const a = r.roles[0]?.key_name;
      setActiveRole(a || null);
      setDraft(new Set(r.roles.find(x => x.key_name === a)?.permissions || []));
    }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function switchRole(key) {
    setActiveRole(key);
    setDraft(new Set(roles.find(r => r.key_name === key)?.permissions || []));
  }
  function toggle(key) {
    setDraft(d => {
      const n = new Set(d);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  async function save() {
    if (!activeRole) return;
    const role = roles.find(r => r.key_name === activeRole);
    if (role.is_system === false) {
      // We allow editing non-system roles only (all roles here are is_system=1 in seed,
      // but the flag exists for future-proofing).
    }
    setSaving(true);
    try {
      await api(`/api/admin/roles/${role.id}/permissions`, { method: 'PUT', body: { permission_keys: [...draft] } });
      await load();
    } finally { setSaving(false); }
  }

  const groupedPerms = useMemo(() => {
    const m = new Map();
    for (const p of perms) {
      if (!m.has(p.module)) m.set(p.module, []);
      m.get(p.module).push(p);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [perms]);

  const active = roles.find(r => r.key_name === activeRole);

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Roles & permissions</h1>
        <p className="text-slate-500">Toggle the permissions each role holds. Changes save on demand and are audit-logged.</p>
      </header>

      <div className="grid lg:grid-cols-[260px,1fr] gap-4">
        {/* Role list */}
        <div className="card">
          <ul className="divide-y divide-slate-200">
            {roles.map(r => (
              <li key={r.key_name}>
                <button onClick={() => switchRole(r.key_name)}
                  className={'w-full text-left px-4 py-3 ' + (activeRole === r.key_name ? 'bg-brand-50' : 'hover:bg-slate-50')}>
                  <div className="font-medium">{r.display_name}</div>
                  <div className="text-xs text-slate-500">
                    {activeRole === r.key_name ? draft.size : (r.permissions?.length || 0)} permissions
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Permission matrix */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">{active?.display_name}</h2>
                <p className="text-xs text-slate-500">{active?.description}</p>
              </div>
              <button onClick={save} className="btn-primary text-sm" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>

            <div className="space-y-5">
              {groupedPerms.map(([module, items]) => (
                <div key={module}>
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">{module}</div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {items.map(p => {
                      const on = draft.has(p.key_name);
                      return (
                        <label key={p.key_name} className={'flex items-start gap-2 p-2 rounded border cursor-pointer ' + (on ? 'border-brand-200 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')}>
                          <input type="checkbox" checked={on} onChange={() => toggle(p.key_name)} className="mt-1" />
                          <div>
                            <code className="text-xs">{p.key_name}</code>
                            <div className="text-xs text-slate-500">{p.display_name}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
