import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import Badge from '../components/ui/Badge.jsx';
import { Field, Input, Select } from '../components/ui/Input.jsx';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '../components/ui/Table.jsx';
import { budgets as budgetsApi, catalog } from '../api/endpoints.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../api/client.js';
import { formatDate, formatUSD } from '../utils/format.js';

const EMPTY_FORM = {
  name: '',
  period: 'monthly',
  cap_usd: '10.00',
  scope_model: '',
  threshold_50: true,
  threshold_80: true,
  threshold_100: true,
};

export default function BudgetsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [models, setModels] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [bR, nR, mR] = await Promise.all([
        budgetsApi.list(),
        budgetsApi.notifications({ page_size: 20 }),
        catalog.models({ page_size: 200 }),
      ]);
      setBudgets(bR.data.results || []);
      setNotifications(nR.data.results || []);
      setModels(mR.data.results || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(budget) {
    setEditing(budget);
    setForm({
      name: budget.name,
      period: budget.period,
      cap_usd: budget.cap_usd,
      scope_model: budget.scope_model || '',
      threshold_50: budget.threshold_50,
      threshold_80: budget.threshold_80,
      threshold_100: budget.threshold_100,
    });
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    try {
      const payload = {
        ...form,
        scope_model: form.scope_model ? Number(form.scope_model) : null,
      };
      if (editing) {
        await budgetsApi.update(editing.id, payload);
        toast.success('Budget updated.');
      } else {
        await budgetsApi.create(payload);
        toast.success('Budget created.');
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(extractError(err, 'Save failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this budget?')) return;
    try {
      await budgetsApi.remove(id);
      toast.success('Budget removed.');
      load();
    } catch (err) {
      toast.error(extractError(err, 'Delete failed.'));
    }
  }

  async function markRead(id) {
    try {
      await budgetsApi.markRead(id);
      load();
    } catch (err) {
      toast.error(extractError(err, 'Could not mark read.'));
    }
  }

  async function markAllRead() {
    try {
      await budgetsApi.markAllRead();
      load();
    } catch (err) {
      toast.error(extractError(err, 'Could not mark all read.'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Budgets & alerts</h1>
          <p className="text-sm text-neutral-500">Cap your spend per period and get notified at thresholds.</p>
        </div>
        <Button onClick={openCreate}>New budget</Button>
      </div>

      <Card>
        <CardHeader
          title="Notifications"
          action={
            notifications.some((n) => !n.read_at) ? (
              <Button size="sm" variant="ghost" onClick={markAllRead}>Mark all read</Button>
            ) : null
          }
        />
        <CardBody>
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : notifications.length === 0 ? (
            <div className="text-sm text-neutral-500">No notifications.</div>
          ) : (
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {notifications.map((n) => (
                <li key={n.id} className="py-3 flex items-start gap-3">
                  <Badge tone={n.kind === 'budget_alert' ? 'warning' : 'neutral'}>{n.kind}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-xs text-neutral-500">{n.body}</div>
                    <div className="text-[11px] text-neutral-500 mt-1">{formatDate(n.created_at)}</div>
                  </div>
                  {!n.read_at && (
                    <button onClick={() => markRead(n.id)} className="text-xs underline text-neutral-500">
                      Mark read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Your budgets" />
        <CardBody className="!p-0">
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Period</TH>
                <TH>Scope</TH>
                <TH className="text-right">Cap</TH>
                <TH className="text-right">Spend</TH>
                <TH className="text-right">% used</TH>
                <TH>Active</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={8}><Skeleton className="h-5 w-full" /></TD></TR>
              ) : budgets.length === 0 ? (
                <EmptyRow colSpan={8}>No budgets yet. Create one to start tracking spend.</EmptyRow>
              ) : (
                budgets.map((b) => {
                  const pct = Number(b.pct_used);
                  const tone = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'neutral';
                  return (
                    <TR key={b.id}>
                      <TD className="font-medium">{b.name}</TD>
                      <TD>{b.period}</TD>
                      <TD className="text-xs">{b.scope_model_slug || 'all models'}</TD>
                      <TD className="text-right">{formatUSD(b.cap_usd)}</TD>
                      <TD className="text-right">{formatUSD(b.spend_usd, { precise: true })}</TD>
                      <TD className="text-right"><Badge tone={tone}>{pct.toFixed(1)}%</Badge></TD>
                      <TD>{b.is_active ? 'yes' : 'no'}</TD>
                      <TD className="text-right space-x-2">
                        <button onClick={() => openEdit(b)} className="text-xs underline">edit</button>
                        <button onClick={() => remove(b.id)} className="text-xs text-red-600">delete</button>
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit budget' : 'New budget'}
        footer={[
          <Button key="cancel" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>,
          <Button key="save" loading={busy} onClick={save}>{editing ? 'Save' : 'Create'}</Button>,
        ]}
      >
        <div className="space-y-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Period">
              <Select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </Field>
            <Field label="Cap (USD)">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.cap_usd}
                onChange={(e) => setForm({ ...form, cap_usd: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="Scope" hint="Limit to a specific model, or leave blank for all.">
            <Select value={form.scope_model} onChange={(e) => setForm({ ...form, scope_model: e.target.value })}>
              <option value="">All models</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.provider_slug} / {m.name}</option>
              ))}
            </Select>
          </Field>
          <div className="space-y-2">
            <div className="text-sm font-medium">Alert thresholds</div>
            {[50, 80, 100].map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form[`threshold_${t}`]}
                  onChange={(e) => setForm({ ...form, [`threshold_${t}`]: e.target.checked })}
                />
                Notify at {t}%
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
