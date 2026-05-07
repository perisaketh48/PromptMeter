import { useEffect, useState } from 'react';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Field, Select, Textarea } from '../../components/ui/Input.jsx';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '../../components/ui/Table.jsx';
import { adminApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { extractError } from '../../api/client.js';
import { formatDate } from '../../utils/format.js';

export default function AdminFeedbackPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const r = await adminApi.feedback(params);
      setItems(r.data.results || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  async function save() {
    try {
      await adminApi.updateFeedback(editing.id, {
        status: editing.status,
        admin_notes: editing.admin_notes,
      });
      toast.success('Feedback updated.');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(extractError(err, 'Save failed.'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Feedback</h1>
          <p className="text-sm text-neutral-500">Triage user-submitted issues and requests.</p>
        </div>
        <Field label="Status">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="in_review">In review</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
      </div>

      <Card>
        <CardBody className="!p-0">
          <Table>
            <THead>
              <tr>
                <TH>When</TH>
                <TH>From</TH>
                <TH>Kind</TH>
                <TH>Subject</TH>
                <TH>Status</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={6}><Skeleton className="h-5 w-full" /></TD></TR>
              ) : items.length === 0 ? (
                <EmptyRow colSpan={6}>No feedback.</EmptyRow>
              ) : (
                items.map((f) => (
                  <TR key={f.id}>
                    <TD>{formatDate(f.created_at)}</TD>
                    <TD className="text-xs">{f.user_email || 'anonymous'}</TD>
                    <TD><Badge tone={f.kind === 'bug' ? 'danger' : f.kind === 'feature' ? 'success' : 'neutral'}>{f.kind}</Badge></TD>
                    <TD className="font-medium">{f.subject}</TD>
                    <TD>
                      <Badge tone={f.status === 'closed' ? 'neutral' : f.status === 'in_review' ? 'warning' : 'success'}>
                        {f.status}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <button onClick={() => setEditing({ ...f })} className="text-xs underline">open</button>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.subject || ''}
        size="lg"
        footer={[
          <Button key="c" variant="secondary" onClick={() => setEditing(null)}>Close</Button>,
          <Button key="s" onClick={save}>Save</Button>,
        ]}
      >
        {editing && (
          <div className="space-y-4">
            <div className="text-xs text-neutral-500">
              {editing.kind} • {editing.user_email || 'anonymous'} • {formatDate(editing.created_at)}
            </div>
            <div className="text-sm whitespace-pre-wrap p-3 rounded-md bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
              {editing.message}
            </div>
            <Field label="Status">
              <Select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="open">Open</option>
                <option value="in_review">In review</option>
                <option value="closed">Closed</option>
              </Select>
            </Field>
            <Field label="Admin notes">
              <Textarea
                rows={4}
                value={editing.admin_notes || ''}
                onChange={(e) => setEditing({ ...editing, admin_notes: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
