import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { Field, Input, Select } from '../components/ui/Input.jsx';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '../components/ui/Table.jsx';
import { catalog, proxy } from '../api/endpoints.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../api/client.js';
import { formatDate } from '../utils/format.js';

export default function CredentialsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [creds, setCreds] = useState([]);
  const [providers, setProviders] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ provider: '', label: 'default', api_key: '' });

  async function load() {
    setLoading(true);
    try {
      const [cR, pR] = await Promise.all([
        proxy.credentials(),
        catalog.providers({ is_active: true, page_size: 100 }),
      ]);
      setCreds(cR.data.results || []);
      setProviders(pR.data.results || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    try {
      await proxy.createCredential({
        provider: Number(form.provider),
        label: form.label || 'default',
        api_key: form.api_key,
      });
      toast.success('Credential saved.');
      setOpen(false);
      setForm({ provider: '', label: 'default', api_key: '' });
      load();
    } catch (err) {
      toast.error(extractError(err, 'Save failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this credential?')) return;
    try {
      await proxy.deleteCredential(id);
      toast.success('Credential deleted.');
      load();
    } catch (err) {
      toast.error(extractError(err, 'Delete failed.'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">API keys</h1>
          <p className="text-sm text-neutral-500">
            Vendor keys are encrypted at rest with Fernet (AES-128 + HMAC). Only the last 4 characters are ever displayed.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Add credential</Button>
      </div>

      <Card>
        <CardBody className="!p-0">
          <Table>
            <THead>
              <tr>
                <TH>Provider</TH>
                <TH>Label</TH>
                <TH>Last 4</TH>
                <TH>Active</TH>
                <TH>Created</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={6}><Skeleton className="h-5 w-full" /></TD></TR>
              ) : creds.length === 0 ? (
                <EmptyRow colSpan={6}>No credentials. Add one to start using the proxy.</EmptyRow>
              ) : (
                creds.map((c) => (
                  <TR key={c.id}>
                    <TD>{c.provider_name}</TD>
                    <TD className="font-mono text-xs">{c.label}</TD>
                    <TD className="font-mono">****{c.last4}</TD>
                    <TD>{c.is_active ? 'yes' : 'no'}</TD>
                    <TD>{formatDate(c.created_at)}</TD>
                    <TD className="text-right">
                      <button onClick={() => remove(c.id)} className="text-xs text-red-600">delete</button>
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
        title="Add credential"
        footer={[
          <Button key="c" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>,
          <Button key="s" loading={busy} disabled={!form.provider || !form.api_key} onClick={save}>Save</Button>,
        ]}
      >
        <div className="space-y-4">
          <Field label="Provider">
            <Select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
              <option value="">Select…</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Label" hint="Distinguishes multiple keys for the same provider.">
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </Field>
          <Field label="API key" hint="Stored encrypted; we never display it again.">
            <Input
              type="password"
              autoComplete="off"
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
