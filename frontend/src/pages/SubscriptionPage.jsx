import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import Badge from '../components/ui/Badge.jsx';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '../components/ui/Table.jsx';
import { billing } from '../api/endpoints.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../api/client.js';
import { formatDate, formatNumber, formatUSD } from '../utils/format.js';

function PlanCard({ plan, current, onSelect, busy }) {
  const isCurrent = current === plan.code;
  return (
    <Card className={isCurrent ? 'ring-2 ring-neutral-900 dark:ring-neutral-100' : ''}>
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-mono text-neutral-500">{plan.code}</div>
            <div className="text-xl font-semibold">{plan.name}</div>
          </div>
          {isCurrent && <Badge tone="success">current</Badge>}
        </div>
        <div className="text-3xl font-semibold">
          {plan.monthly_price === '0.00' ? 'Free' : formatUSD(plan.monthly_price)}
          {plan.monthly_price !== '0.00' && <span className="text-sm text-neutral-500">/mo</span>}
        </div>
        <p className="text-sm text-neutral-500">{plan.description}</p>
        <ul className="text-sm space-y-1">
          <li className="flex justify-between"><span className="text-neutral-500">Tokens / mo</span><span>{plan.monthly_token_quota == null ? 'Unlimited' : formatNumber(plan.monthly_token_quota)}</span></li>
          <li className="flex justify-between"><span className="text-neutral-500">Cost cap</span><span>{plan.monthly_cost_cap_usd == null ? 'Unlimited' : formatUSD(plan.monthly_cost_cap_usd)}</span></li>
          <li className="flex justify-between"><span className="text-neutral-500">API keys</span><span>{plan.max_keys == null ? 'Unlimited' : plan.max_keys}</span></li>
        </ul>
        <div className="text-[11px] text-neutral-500">
          {plan.features.join(' · ')}
        </div>
        <Button
          className="w-full"
          variant={isCurrent ? 'secondary' : 'primary'}
          disabled={isCurrent || busy}
          onClick={() => onSelect(plan)}
        >
          {isCurrent ? 'Current plan' : 'Switch'}
        </Button>
      </div>
    </Card>
  );
}

export default function SubscriptionPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [quota, setQuota] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [plansR, subR, quotaR, invR] = await Promise.all([
        billing.plans(),
        billing.subscription(),
        billing.quota(),
        billing.invoices(),
      ]);
      setPlans(plansR.data || []);
      setSub(subR.data);
      setQuota(quotaR.data);
      setInvoices(invR.data.results || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function changePlan() {
    if (!confirm) return;
    setBusy(true);
    try {
      await billing.changePlan(confirm.code);
      toast.success(`Switched to ${confirm.name}.`);
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error(extractError(err, 'Plan change failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!confirm('Cancel your subscription?')) return;
    try {
      await billing.cancel();
      toast.success('Subscription canceled.');
      load();
    } catch (err) {
      toast.error(extractError(err, 'Cancel failed.'));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Subscription</h1>
        <p className="text-sm text-neutral-500">Manage plan, quota and invoices.</p>
      </div>

      <Card>
        <CardHeader title="Current period" subtitle={sub ? `${formatDate(sub.current_period_start)} → ${formatDate(sub.current_period_end)}` : ''} />
        <CardBody>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : !quota ? (
            <div className="text-sm text-neutral-500">No subscription.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <UsageBar
                label="Tokens"
                used={quota.used_tokens}
                cap={quota.token_quota}
                formatter={formatNumber}
                unit="tokens"
              />
              <UsageBar
                label="Spend"
                used={Number(quota.used_cost_usd)}
                cap={quota.cost_cap_usd != null ? Number(quota.cost_cap_usd) : null}
                formatter={(v) => formatUSD(v, { precise: true })}
                unit="USD"
              />
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-neutral-500">Plan</div>
                <div className="text-2xl font-semibold">{quota.plan_code}</div>
                <div className="text-xs text-neutral-500">Status: {sub?.status}</div>
                {sub?.status === 'active' && (
                  <button onClick={cancel} className="text-xs text-red-600 mt-1 underline">
                    Cancel subscription
                  </button>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
          : plans.map((p) => (
              <PlanCard
                key={p.code}
                plan={p}
                current={sub?.plan?.code}
                onSelect={(plan) => setConfirm(plan)}
                busy={busy}
              />
            ))}
      </div>

      <Card>
        <CardHeader title="Invoices" />
        <CardBody>
          <Table>
            <THead>
              <tr>
                <TH>Issued</TH>
                <TH>Period</TH>
                <TH className="text-right">Amount</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={4}><Skeleton className="h-5 w-full" /></TD></TR>
              ) : invoices.length === 0 ? (
                <EmptyRow colSpan={4}>No invoices yet.</EmptyRow>
              ) : (
                invoices.map((i) => (
                  <TR key={i.id}>
                    <TD>{formatDate(i.issued_at)}</TD>
                    <TD className="text-xs">
                      {formatDate(i.period_start)} → {formatDate(i.period_end)}
                    </TD>
                    <TD className="text-right">{formatUSD(i.amount)} {i.currency}</TD>
                    <TD>
                      <Badge tone={i.status === 'paid' ? 'success' : i.status === 'void' ? 'neutral' : 'warning'}>
                        {i.status}
                      </Badge>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={`Switch to ${confirm?.name || ''}?`}
        footer={[
          <Button key="cancel" variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>,
          <Button key="ok" loading={busy} onClick={changePlan}>Confirm switch</Button>,
        ]}
      >
        <p className="text-sm">
          Your plan will change immediately. The new quota and cost cap take effect for the current period.
        </p>
      </Modal>
    </div>
  );
}

function UsageBar({ label, used, cap, formatter, unit }) {
  const pct = cap != null && cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold">{formatter(used)}</div>
      <div className="text-xs text-neutral-500">
        of {cap == null ? 'unlimited' : formatter(cap)} {unit}
      </div>
      <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
        <div
          className={`h-full ${pct >= 100 ? 'bg-red-600' : pct >= 80 ? 'bg-amber-500' : 'bg-neutral-900 dark:bg-neutral-100'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
