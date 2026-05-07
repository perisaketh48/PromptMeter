import { useEffect, useState } from 'react';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Field, Input } from '../../components/ui/Input.jsx';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { catalog } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { extractError } from '../../api/client.js';

const EMPTY = { name: '', slug: '', logo_url: '', is_active: true };

export default function AdminProvidersPage() {
  const toast = useToast();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await catalog.providers({ page_size: 100 });
      setProviders(r.data.results || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(p) {
    setEditing(p);
    setForm({ name: p.name, slug: p.slug, logo_url: p.logo_url || '', is_active: p.is_active });
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    try {
      if (editing) {
        await catalog.updateProvider(editing.slug, form);
        toast.success('Provider updated.');
      } else {
        await catalog.createProvider(form);
        toast.success('Provider created.');
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(extractError(err, 'Save failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(p) {
    if (!confirm(`Delete provider "${p.name}" and all its models?`)) return;
    try {
      await catalog.deleteProvider(p.slug);
      toast.success('Provider deleted.');
      load();
    } catch (err) {
      toast.error(extractError(err, 'Delete failed.'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Providers</h1>
          <p className="text-sm text-neutral-500">The vendor catalog.</p>
        </div>
        <Button onClick={openCreate}>New provider</Button>
      </div>

      <Card>
        <CardBody className="!p-0">
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Slug</TH>
                <TH>Models</TH>
                <TH>Active</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={5}><Skeleton className="h-5 w-full" /></TD></TR>
              ) : providers.length === 0 ? (
                <EmptyRow colSpan={5}>No providers.</EmptyRow>
              ) : (
                providers.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-medium">{p.name}</TD>
                    <TD className="font-mono text-xs">{p.slug}</TD>
                    <TD>{p.model_count}</TD>
                    <TD><Badge tone={p.is_active ? 'success' : 'neutral'}>{p.is_active ? 'yes' : 'no'}</Badge></TD>
                    <TD className="text-right space-x-3">
                      <button onClick={() => openEdit(p)} className="text-xs underline">edit</button>
                      <button onClick={() => remove(p)} className="text-xs text-red-600">delete</button>
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
        title={editing ? 'Edit provider' : 'New provider'}
        footer={[
          <Button key="c" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>,
          <Button key="s" loading={busy} onClick={save}>{editing ? 'Save' : 'Create'}</Button>,
        ]}
      >
        <div className="space-y-4">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Slug" hint="URL-safe, e.g. 'openai'."><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Logo URL (optional)"><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Active
          </label>
        </div>
      </Modal>
    </div>
  );
}
