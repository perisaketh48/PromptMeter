import { useEffect, useState } from 'react';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Field, Input, Select } from '../../components/ui/Input.jsx';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '../../components/ui/Table.jsx';
import { adminApi, billing } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { extractError } from '../../api/client.js';
import { formatDate } from '../../utils/format.js';

export default function AdminUsersPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ count: 0, results: [] });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planTarget, setPlanTarget] = useState(null);
  const [planCode, setPlanCode] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = { page, page_size: 25 };
      if (search) params.search = search;
      const [uR, pR] = await Promise.all([
        adminApi.users(params),
        billing.plans(),
      ]);
      setData(uR.data);
      setPlans(pR.data);
    } catch (err) {
      toast.error(extractError(err, 'Could not load users.'));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, search]);

  async function toggleActive(user) {
    try {
      await adminApi.updateUser(user.id, { is_active: !user.is_active });
      toast.success(`${user.email} ${user.is_active ? 'deactivated' : 'activated'}.`);
      load();
    } catch (err) {
      toast.error(extractError(err, 'Update failed.'));
    }
  }

  async function assignPlan() {
    if (!planTarget || !planCode) return;
    try {
      await adminApi.assignPlan(planTarget.id, planCode);
      toast.success(`Assigned ${planCode} to ${planTarget.email}.`);
      setPlanTarget(null);
      setPlanCode('');
      load();
    } catch (err) {
      toast.error(extractError(err, 'Assign failed.'));
    }
  }

  const totalPages = Math.max(1, Math.ceil((data.count || 0) / 25));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-neutral-500">Manage accounts and subscription overrides.</p>
        </div>
        <Field htmlFor="search" label="Search">
          <Input
            id="search"
            placeholder="email or name"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </Field>
      </div>

      <Card>
        <CardBody className="!p-0">
          <Table>
            <THead>
              <tr>
                <TH>Email</TH>
                <TH>Name</TH>
                <TH>Role</TH>
                <TH>Plan</TH>
                <TH>Active</TH>
                <TH>Joined</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={7}><Skeleton className="h-5 w-full" /></TD></TR>
              ) : data.results.length === 0 ? (
                <EmptyRow colSpan={7}>No users.</EmptyRow>
              ) : (
                data.results.map((u) => (
                  <TR key={u.id}>
                    <TD className="font-medium">{u.email}</TD>
                    <TD>{u.full_name || '—'}</TD>
                    <TD>
                      <Badge tone={u.role === 'admin' || u.is_staff ? 'warning' : 'neutral'}>
                        {u.is_superuser ? 'super' : u.role}
                      </Badge>
                    </TD>
                    <TD className="font-mono text-xs">{u.plan_code || '—'}</TD>
                    <TD>{u.is_active ? 'yes' : 'no'}</TD>
                    <TD>{formatDate(u.date_joined)}</TD>
                    <TD className="text-right space-x-3">
                      <button onClick={() => { setPlanTarget(u); setPlanCode(u.plan_code || 'FREE'); }} className="text-xs underline">
                        Assign plan
                      </button>
                      <button onClick={() => toggleActive(u)} className="text-xs underline text-amber-600">
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
          <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500">{data.count} user{data.count === 1 ? '' : 's'}</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <span className="text-xs text-neutral-500">page {page} / {totalPages}</span>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={Boolean(planTarget)}
        onClose={() => setPlanTarget(null)}
        title={`Assign plan to ${planTarget?.email || ''}`}
        footer={[
          <Button key="c" variant="secondary" onClick={() => setPlanTarget(null)}>Cancel</Button>,
          <Button key="s" onClick={assignPlan}>Assign</Button>,
        ]}
      >
        <Field label="Plan">
          <Select value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
            <option value="">Select…</option>
            {plans.map((p) => (
              <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
            ))}
          </Select>
        </Field>
      </Modal>
    </div>
  );
}
