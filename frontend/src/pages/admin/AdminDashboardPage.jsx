import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { LineUsageChart, BarUsageChart, DonutChart } from '../../components/charts/Charts.jsx';
import { adminApi } from '../../api/endpoints.js';
import { formatNumber, formatShortDate, formatTokens, formatUSD } from '../../utils/format.js';
import { useTheme } from '../../context/ThemeContext.jsx';

function StatCard({ label, value, sub, loading }) {
  return (
    <Card>
      <div className="p-5 space-y-1.5">
        <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
        {loading ? <Skeleton className="h-7 w-24" /> : <div className="text-2xl font-semibold">{value}</div>}
        {sub && <div className="text-xs text-neutral-500">{sub}</div>}
      </div>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { theme } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.stats()
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dayData = (stats?.daily_usage_30d || []).map((d) => ({
    label: formatShortDate(d.day),
    cost: Number(d.cost_usd),
    tokens: d.tokens,
  }));

  const planData = (stats?.plan_breakdown || []).map((p) => ({
    name: p.plan_code,
    value: p.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin overview</h1>
        <p className="text-sm text-neutral-500">System-wide health and growth.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Users" value={formatNumber(stats?.users_total)} loading={loading} sub={`${stats?.users_active_30d || 0} active in 30d`} />
        <StatCard label="Providers" value={formatNumber(stats?.providers_active)} loading={loading} sub={`${stats?.providers_total || 0} total`} />
        <StatCard label="Models" value={formatNumber(stats?.models_active)} loading={loading} sub={`${stats?.models_total || 0} total`} />
        <StatCard
          label="Spend (30d)"
          value={loading ? '' : formatUSD(stats?.usage_30d?.cost_usd)}
          loading={loading}
          sub={loading ? '' : `${formatNumber(stats?.usage_30d?.calls)} calls`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Daily spend" subtitle="Last 30 days" />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : dayData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-neutral-500">No usage yet.</div>
            ) : (
              <LineUsageChart data={dayData} dataKey="cost" formatter={(v) => formatUSD(v, { precise: true })} />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Plan distribution" />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : planData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-neutral-500">No subscribers.</div>
            ) : (
              <DonutChart data={planData} isDark={theme === 'dark'} formatter={formatNumber} />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Tokens by day" />
        <CardBody>
          {loading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : dayData.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-neutral-500">No usage yet.</div>
          ) : (
            <BarUsageChart data={dayData} dataKey="tokens" formatter={formatTokens} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
