import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import Badge from '../components/ui/Badge.jsx';
import { Field, Input, Select } from '../components/ui/Input.jsx';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '../components/ui/Table.jsx';
import { catalog, usage } from '../api/endpoints.js';
import { tokenStore } from '../api/client.js';
import { formatDate, formatNumber, formatTokens, formatUSD } from '../utils/format.js';

export default function UsagePage() {
  const [filters, setFilters] = useState({
    provider_slug: '',
    model_slug: '',
    source: '',
    status: '',
    days: '30',
  });
  const [page, setPage] = useState(1);
  const [providers, setProviders] = useState([]);
  const [models, setModels] = useState([]);
  const [data, setData] = useState({ count: 0, results: [], next: null, previous: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    catalog.providers({ page_size: 100 })
      .then((r) => setProviders(r.data.results || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters.provider_slug) {
      setModels([]);
      return;
    }
    catalog.models({ provider_slug: filters.provider_slug, page_size: 100 })
      .then((r) => setModels(r.data.results || []))
      .catch(() => setModels([]));
  }, [filters.provider_slug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { page, page_size: 25 };
    if (filters.provider_slug) params.provider_slug = filters.provider_slug;
    if (filters.model_slug) params.model_slug = filters.model_slug;
    if (filters.source) params.source = filters.source;
    if (filters.status) params.status = filters.status;
    if (filters.days) {
      const end = new Date();
      const start = new Date(end.getTime() - Number(filters.days) * 24 * 3600 * 1000);
      params.start = start.toISOString();
      params.end = end.toISOString();
    }
    usage.records(params)
      .then((r) => { if (!cancelled) setData(r.data); })
      .catch(() => { if (!cancelled) setData({ count: 0, results: [] }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters, page]);

  function update(field) {
    return (e) => {
      const value = e.target.value;
      setPage(1);
      setFilters((curr) => {
        if (field === 'provider_slug') return { ...curr, provider_slug: value, model_slug: '' };
        return { ...curr, [field]: value };
      });
    };
  }

  function exportCsv() {
    const params = {};
    if (filters.days) {
      const end = new Date();
      const start = new Date(end.getTime() - Number(filters.days) * 24 * 3600 * 1000);
      params.start = start.toISOString();
      params.end = end.toISOString();
    }
    const url = usage.exportUrl(params);
    // Need auth header on download — use a programmatic fetch + blob.
    fetch(url, {
      headers: { Authorization: `Bearer ${tokenStore.getAccess()}` },
    }).then(async (r) => {
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'usage.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  const totalPages = Math.max(1, Math.ceil((data.count || 0) / 25));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Usage history</h1>
          <p className="text-sm text-neutral-500">Every billable call your account has made.</p>
        </div>
        <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
      </div>

      <Card>
        <CardHeader title="Filters" />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Field label="Window" htmlFor="days">
              <Select id="days" value={filters.days} onChange={update('days')}>
                <option value="1">Last 24h</option>
                <option value="7">Last 7d</option>
                <option value="30">Last 30d</option>
                <option value="90">Last 90d</option>
                <option value="">All time</option>
              </Select>
            </Field>
            <Field label="Provider" htmlFor="provider">
              <Select id="provider" value={filters.provider_slug} onChange={update('provider_slug')}>
                <option value="">All providers</option>
                {providers.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Model" htmlFor="model">
              <Select id="model" value={filters.model_slug} onChange={update('model_slug')} disabled={!filters.provider_slug}>
                <option value="">All models</option>
                {models.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
              </Select>
            </Field>
            <Field label="Source" htmlFor="source">
              <Select id="source" value={filters.source} onChange={update('source')}>
                <option value="">All sources</option>
                <option value="proxy">Proxy</option>
                <option value="estimator">Estimator</option>
              </Select>
            </Field>
            <Field label="Status" htmlFor="status">
              <Select id="status" value={filters.status} onChange={update('status')}>
                <option value="">All</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="!p-0">
          <Table>
            <THead>
              <tr>
                <TH>When</TH>
                <TH>Provider / Model</TH>
                <TH>Source</TH>
                <TH>Status</TH>
                <TH className="text-right">Prompt</TH>
                <TH className="text-right">Completion</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Cost</TH>
                <TH className="text-right">Latency</TH>
              </tr>
            </THead>
            <TBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TR key={i}>
                    <TD colSpan={9}><Skeleton className="h-5 w-full" /></TD>
                  </TR>
                ))
              ) : data.results.length === 0 ? (
                <EmptyRow colSpan={9}>No records match your filters.</EmptyRow>
              ) : (
                data.results.map((r) => (
                  <TR key={r.id}>
                    <TD>{formatDate(r.created_at)}</TD>
                    <TD className="font-mono text-xs">{r.provider_slug} / {r.model_slug}</TD>
                    <TD>{r.source}</TD>
                    <TD>
                      <Badge tone={r.status === 'success' ? 'success' : 'danger'}>{r.status}</Badge>
                    </TD>
                    <TD className="text-right">{formatNumber(r.prompt_tokens)}</TD>
                    <TD className="text-right">{formatNumber(r.completion_tokens)}</TD>
                    <TD className="text-right">{formatTokens(r.total_tokens)}</TD>
                    <TD className="text-right">{formatUSD(r.cost_usd, { precise: true })}</TD>
                    <TD className="text-right">{r.latency_ms ? `${r.latency_ms}ms` : '—'}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
          <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500">{data.count} record{data.count === 1 ? '' : 's'}</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" disabled={!data.previous} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <span className="text-xs text-neutral-500">page {page} / {totalPages}</span>
              <Button size="sm" variant="secondary" disabled={!data.next} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
