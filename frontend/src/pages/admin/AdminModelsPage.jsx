import { useEffect, useState } from 'react';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { Field, Input, Select } from '../../components/ui/Input.jsx';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '../../components/ui/Table.jsx';
import { catalog } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { extractError } from '../../api/client.js';
import { formatNumber } from '../../utils/format.js';

const EMPTY = {
  provider: '',
  name: '',
  slug: '',
  input_price: '0.001',
  output_price: '0.002',
  context_window: 128000,
  max_output_tokens: 4096,
  capabilities: ['text', 'chat'],
  is_active: true,
};

export default function AdminModelsPage() {
  const toast = useToast();
  const [providers, setProviders] = useState([]);
  const [models, setModels] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [providerFilter, setProviderFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = { page_size: 200 };
      if (providerFilter) params.provider_slug = providerFilter;
      const [pR, mR, cR] = await Promise.all([
        catalog.providers({ page_size: 100 }),
        catalog.models(params),
        catalog.capabilities(),
      ]);
      setProviders(pR.data.results || []);
      setModels(mR.data.results || []);
      setCapabilities(cR.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [providerFilter]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, provider: providers[0]?.id || '' });
    setOpen(true);
  }
  function openEdit(m) {
    setEditing(m);
    setForm({
      provider: m.provider,
      name: m.name,
      slug: m.slug,
      input_price: m.input_price,
      output_price: m.output_price,
      context_window: m.context_window,
      max_output_tokens: m.max_output_tokens,
      capabilities: m.capabilities,
      is_active: m.is_active,
    });
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    try {
      const payload = { ...form, provider: Number(form.provider) };
      if (editing) {
        await catalog.updateModel(editing.id, payload);
        toast.success('Model updated.');
      } else {
        await catalog.createModel(payload);
        toast.success('Model created.');
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(extractError(err, 'Save failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(m) {
    if (!confirm(`Delete model "${m.name}"?`)) return;
    try {
      await catalog.deleteModel(m.id);
      toast.success('Model deleted.');
      load();
    } catch (err) {
      toast.error(extractError(err, 'Delete failed.'));
    }
  }

  function toggleCap(code) {
    setForm((f) => ({
      ...f,
      capabilities: f.capabilities.includes(code)
        ? f.capabilities.filter((c) => c !== code)
        : [...f.capabilities, code],
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Models</h1>
          <p className="text-sm text-neutral-500">Per-provider model catalog and pricing.</p>
        </div>
        <div className="flex items-end gap-3">
          <Field label="Filter by provider">
            <Select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
              <option value="">All providers</option>
              {providers.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </Select>
          </Field>
          <Button onClick={openCreate}>New model</Button>
        </div>
      </div>

      <Card>
        <CardBody className="!p-0">
          <Table>
            <THead>
              <tr>
                <TH>Provider</TH>
                <TH>Name</TH>
                <TH>Slug</TH>
                <TH className="text-right">Input $/1K</TH>
                <TH className="text-right">Output $/1K</TH>
                <TH className="text-right">Context</TH>
                <TH className="text-right">Max out</TH>
                <TH>Active</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={9}><Skeleton className="h-5 w-full" /></TD></TR>
              ) : models.length === 0 ? (
                <EmptyRow colSpan={9}>No models.</EmptyRow>
              ) : (
                models.map((m) => (
                  <TR key={m.id}>
                    <TD>{m.provider_name}</TD>
                    <TD className="font-medium">{m.name}</TD>
                    <TD className="font-mono text-xs">{m.slug}</TD>
                    <TD className="text-right">${m.input_price}</TD>
                    <TD className="text-right">${m.output_price}</TD>
                    <TD className="text-right">{formatNumber(m.context_window)}</TD>
                    <TD className="text-right">{formatNumber(m.max_output_tokens)}</TD>
                    <TD><Badge tone={m.is_active ? 'success' : 'neutral'}>{m.is_active ? 'yes' : 'no'}</Badge></TD>
                    <TD className="text-right space-x-3">
                      <button onClick={() => openEdit(m)} className="text-xs underline">edit</button>
                      <button onClick={() => remove(m)} className="text-xs text-red-600">delete</button>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit model' : 'New model'}
        size="lg"
        footer={[
          <Button key="c" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>,
          <Button key="s" loading={busy} onClick={save}>{editing ? 'Save' : 'Create'}</Button>,
        ]}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Provider">
            <Select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
              <option value="">Select…</option>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Slug" hint="Unique within provider"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Active">
            <Select value={String(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
          </Field>
          <Field label="Input price ($/1K)"><Input type="number" step="0.00000001" value={form.input_price} onChange={(e) => setForm({ ...form, input_price: e.target.value })} /></Field>
          <Field label="Output price ($/1K)"><Input type="number" step="0.00000001" value={form.output_price} onChange={(e) => setForm({ ...form, output_price: e.target.value })} /></Field>
          <Field label="Context window (tokens)"><Input type="number" value={form.context_window} onChange={(e) => setForm({ ...form, context_window: Number(e.target.value) })} /></Field>
          <Field label="Max output tokens"><Input type="number" value={form.max_output_tokens} onChange={(e) => setForm({ ...form, max_output_tokens: Number(e.target.value) })} /></Field>
          <div className="md:col-span-2">
            <div className="text-sm font-medium mb-2">Capabilities</div>
            <div className="flex flex-wrap gap-2">
              {capabilities.map((c) => {
                const active = form.capabilities.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleCap(c.value)}
                    className={`px-3 py-1 rounded-md border text-xs ${
                      active
                        ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100'
                        : 'border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
