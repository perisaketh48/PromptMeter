import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';

const stroke = 'currentColor';

const tooltipBaseClass =
  'rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-200 shadow-md';

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className={tooltipBaseClass}>
      <div className="font-medium mb-1">{label}</div>
      <div className="space-y-0.5">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-neutral-500">{p.name}:</span>
            <span className="font-medium">{formatter ? formatter(p.value) : p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineUsageChart({ data, dataKey = 'value', xKey = 'label', formatter, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis dataKey={xKey} stroke={stroke} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={stroke} fontSize={11} tickLine={false} axisLine={false} width={40} />
        <Tooltip content={<ChartTooltip formatter={formatter} />} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={stroke}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarUsageChart({ data, dataKey = 'value', xKey = 'label', formatter, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis dataKey={xKey} stroke={stroke} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={stroke} fontSize={11} tickLine={false} axisLine={false} width={40} />
        <Tooltip content={<ChartTooltip formatter={formatter} />} />
        <Bar dataKey={dataKey} fill={stroke} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE_SHADES = ['#171717', '#525252', '#a3a3a3', '#d4d4d4', '#404040', '#737373'];
const PIE_DARK = ['#fafafa', '#d4d4d4', '#a3a3a3', '#737373', '#e5e5e5', '#525252'];

export function DonutChart({ data, dataKey = 'value', nameKey = 'name', height = 240, isDark = false, formatter }) {
  const palette = isDark ? PIE_DARK : PIE_SHADES;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {data.map((entry, idx) => (
            <Cell key={entry[nameKey]} fill={palette[idx % palette.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip formatter={formatter} />} />
        <Legend
          iconSize={8}
          formatter={(v) => <span className="text-xs text-neutral-500">{v}</span>}
          verticalAlign="bottom"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
