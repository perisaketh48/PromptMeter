import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import Badge from '../components/ui/Badge.jsx';
import { BarUsageChart, DonutChart, LineUsageChart } from '../components/charts/Charts.jsx';
import { billing, budgets as budgetsApi, usage } from '../api/endpoints.js';
import { formatDate, formatNumber, formatShortDate, formatTokens, formatUSD } from '../utils/format.js';
import { useTheme } from '../context/ThemeContext.jsx';

function StatCard({ label, value, sub, loading }) {
  return (
    <Card>
      <div className="p-5 space-y-1.5">
        <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className="text-2xl font-semibold">{value}</div>
        )}
        {sub && <div className="text-xs text-neutral-500">{sub}</div>}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [byDay, setByDay] = useState([]);
  const [byModel, setByModel] = useState([]);
  const [recent, setRecent] = useState([]);
  const [quota, setQuota] = useState(null);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [summaryR, byDayR, byModelR, recentR, quotaR, notifsR] = await Promise.all([
          usage.summary({ days: 30 }),
          usage.byDay({ days: 30 }),
          usage.byModel({ days: 30 }),
          usage.records({ page_size: 8, ordering: '-created_at' }),
          billing.quota(),
          budgetsApi.notifications({ unread: true }),
        ]);
        if (cancelled) return;
        setSummary(summaryR.data);
        setByDay(byDayR.data);
        setByModel(byModelR.data);
        setRecent(recentR.data.results || []);
        setQuota(quotaR.data);
        setNotifs(notifsR.data.results || []);
      } catch {
        // ignored — display fallbacks below
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const dayChartData = byDay.map((d) => ({
    label: formatShortDate(d.day),
    cost: Number(d.cost_usd),
    tokens: d.tokens,
    calls: d.calls,
  }));

  const modelChartData = byModel.slice(0, 6).map((m) => ({
    name: m.model_name,
    value: Number(m.cost_usd),
  }));

  const totalCalls = summary?.total_calls ?? 0;
  const totalTokens = summary?.total_tokens ?? 0;
  const totalCost = summary?.total_cost_usd ?? 0;

  const tokensRemainingPct = (() => {
    if (!quota || quota.token_quota == null || quota.token_quota === 0) return null;
    return Math.max(0, Math.min(100, (quota.tokens_remaining / quota.token_quota) * 100));
  })();

  const overBudget = notifs.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-neutral-500">Last 30 days of activity.</p>
        </div>
      </div>

      {overBudget && (
        <Card className="border-amber-300 dark:border-amber-700">
          <div className="p-4 flex items-start gap-3">
            <span className="text-amber-500 text-xl leading-none">!</span>
            <div className="flex-1">
              <div className="text-sm font-medium">{notifs.length} unread alert{notifs.length === 1 ? '' : 's'}</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                {notifs[0].title}
              </div>
            </div>
            <Link to="/budgets" className="text-xs underline">View</Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Calls (30d)" value={formatNumber(totalCalls)} loading={loading} />
        <StatCard label="Tokens (30d)" value={formatTokens(totalTokens)} loading={loading} />
        <StatCard label="Spend (30d)" value={formatUSD(totalCost)} loading={loading} />
        <StatCard
          label="Plan"
          value={quota?.plan_code || '—'}
          loading={loading}
          sub={
            tokensRemainingPct != null
              ? `${tokensRemainingPct.toFixed(0)}% quota remaining`
              : 'unlimited'
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Cost trend" subtitle="USD per day" />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : dayChartData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-neutral-500">
                No usage in this window.
              </div>
            ) : (
              <LineUsageChart
                data={dayChartData}
                dataKey="cost"
                xKey="label"
                formatter={(v) => formatUSD(v, { precise: true })}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="By model" subtitle="Spend share" />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : modelChartData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-neutral-500">
                No usage in this window.
              </div>
            ) : (
              <DonutChart
                data={modelChartData}
                isDark={theme === 'dark'}
                formatter={(v) => formatUSD(v, { precise: true })}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Tokens by day" subtitle="Last 30 days" />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : dayChartData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-neutral-500">
                No usage in this window.
              </div>
            ) : (
              <BarUsageChart
                data={dayChartData}
                dataKey="tokens"
                xKey="label"
                formatter={(v) => formatTokens(v)}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent activity" subtitle="Latest 8 calls" />
          <CardBody>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : recent.length === 0 ? (
              <div className="text-sm text-neutral-500 py-6 text-center">No calls yet.</div>
            ) : (
              <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
                {recent.map((r) => (
                  <li key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.model_name}</div>
                      <div className="text-xs text-neutral-500 truncate">
                        {formatDate(r.created_at)} · {r.source}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs">{formatTokens(r.total_tokens)} tokens</div>
                      <div className="text-xs text-neutral-500">{formatUSD(r.cost_usd)}</div>
                    </div>
                    {r.status === 'error' && <Badge tone="danger">err</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
