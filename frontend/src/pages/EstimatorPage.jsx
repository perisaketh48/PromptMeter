import { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { Field, Input, Select, Textarea } from '../components/ui/Input.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '../components/ui/Table.jsx';
import { catalog, tokenizer } from '../api/endpoints.js';
import useDebounce from '../hooks/useDebounce.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../api/client.js';
import { formatDate, formatNumber, formatUSD } from '../utils/format.js';

export default function EstimatorPage() {
  const toast = useToast();
  const [providers, setProviders] = useState([]);
  const [models, setModels] = useState([]);
  const [providerSlug, setProviderSlug] = useState('');
  const [modelId, setModelId] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [inputText, setInputText] = useState('');
  const [expectedOutput, setExpectedOutput] = useState(256);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const debouncedInput = useDebounce(inputText, 350);
  const debouncedSystem = useDebounce(systemPrompt, 350);
  const debouncedExpected = useDebounce(expectedOutput, 250);

  useEffect(() => {
    catalog.providers({ is_active: true, page_size: 100 })
      .then((r) => setProviders(r.data.results || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!providerSlug) {
      setModels([]);
      setModelId('');
      return;
    }
    catalog.models({ provider_slug: providerSlug, is_active: true, page_size: 100 })
      .then((r) => {
        setModels(r.data.results || []);
        setModelId('');
      })
      .catch(() => setModels([]));
  }, [providerSlug]);

  const selectedModel = useMemo(
    () => models.find((m) => String(m.id) === String(modelId)) || null,
    [models, modelId],
  );

  // Live estimation (debounced) without saving.
  useEffect(() => {
    if (!modelId || (!debouncedInput && !debouncedSystem)) {
      setEstimate(null);
      setError('');
      return;
    }
    let cancelled = false;
    setEstimating(true);
    setError('');
    tokenizer.estimate({
      model_id: Number(modelId),
      input_text: debouncedInput,
      system_prompt: debouncedSystem,
      expected_output_tokens: Number(debouncedExpected) || 0,
    })
      .then((r) => { if (!cancelled) setEstimate(r.data); })
      .catch((err) => {
        if (cancelled) return;
        setEstimate(null);
        setError(extractError(err, 'Estimation failed.'));
      })
      .finally(() => { if (!cancelled) setEstimating(false); });
    return () => { cancelled = true; };
  }, [modelId, debouncedInput, debouncedSystem, debouncedExpected]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const r = await tokenizer.history({ page_size: 10 });
      setHistory(r.data.results || []);
    } finally {
      setHistoryLoading(false);
    }
  }
  useEffect(() => { loadHistory(); }, []);

  async function saveEstimate() {
    if (!modelId) return;
    try {
      await tokenizer.estimate({
        model_id: Number(modelId),
        input_text: inputText,
        system_prompt: systemPrompt,
        expected_output_tokens: Number(expectedOutput) || 0,
        save_history: true,
      });
      toast.success('Estimate saved.');
      loadHistory();
    } catch (err) {
      toast.error(extractError(err, 'Could not save estimate.'));
    }
  }

  async function deleteEstimate(id) {
    try {
      await tokenizer.deleteHistory(id);
      setHistory((curr) => curr.filter((e) => e.id !== id));
    } catch (err) {
      toast.error(extractError(err, 'Could not delete.'));
    }
  }

  const overContext =
    selectedModel && estimate && estimate.total_tokens > selectedModel.context_window;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Token estimator</h1>
        <p className="text-sm text-neutral-500">Predict token counts and cost before you call the model.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Prompt" />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Provider" htmlFor="provider">
                <Select
                  id="provider"
                  value={providerSlug}
                  onChange={(e) => setProviderSlug(e.target.value)}
                >
                  <option value="">Select a provider…</option>
                  {providers.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Model" htmlFor="model">
                <Select
                  id="model"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  disabled={!providerSlug}
                >
                  <option value="">{providerSlug ? 'Select a model…' : 'Choose provider first'}</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · ${m.input_price}/${m.output_price} per 1K
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="System prompt (optional)" htmlFor="system">
                <Textarea
                  id="system"
                  rows={3}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a concise assistant."
                />
              </Field>
              <Field label="User prompt" htmlFor="prompt">
                <Textarea
                  id="prompt"
                  rows={8}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type or paste the prompt you'll send to the model…"
                />
              </Field>
              <Field
                label="Expected completion tokens"
                htmlFor="expected"
                hint={selectedModel ? `Capped at ${formatNumber(selectedModel.max_output_tokens)}` : undefined}
              >
                <Input
                  id="expected"
                  type="number"
                  min={0}
                  max={selectedModel?.max_output_tokens ?? undefined}
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Live estimate"
            subtitle={estimating ? 'Calculating…' : selectedModel ? selectedModel.name : 'No model selected'}
          />
          <CardBody>
            {error && <div className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</div>}
            {!modelId ? (
              <div className="text-sm text-neutral-500">Select a provider and model to see an estimate.</div>
            ) : !estimate ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-6 w-1/4" />
              </div>
            ) : (
              <div className="space-y-3">
                <Row label="Input tokens" value={formatNumber(estimate.input_tokens)} />
                <Row label="Output tokens" value={formatNumber(estimate.output_tokens)} />
                <Row label="Total tokens" value={formatNumber(estimate.total_tokens)} bold />
                <hr className="border-neutral-200 dark:border-neutral-800" />
                <Row label="Input cost" value={formatUSD(estimate.input_cost, { precise: true })} />
                <Row label="Output cost" value={formatUSD(estimate.output_cost, { precise: true })} />
                <Row label="Estimated cost" value={formatUSD(estimate.estimated_cost, { precise: true })} bold />
                <div className="text-[11px] text-neutral-500 pt-2">
                  Strategy: <span className="font-mono">{estimate.strategy}</span>
                </div>
                {overContext && (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    Total exceeds the model's context window of {formatNumber(selectedModel.context_window)}.
                  </div>
                )}
                <Button
                  variant="secondary"
                  className="w-full mt-2"
                  onClick={saveEstimate}
                  disabled={estimating}
                >
                  Save to history
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="History" subtitle="Latest 10 estimates" />
        <CardBody>
          <Table>
            <THead>
              <tr>
                <TH>When</TH>
                <TH>Provider / Model</TH>
                <TH className="text-right">Input</TH>
                <TH className="text-right">Output</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Cost</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {historyLoading ? (
                <TR><TD colSpan={7}><Skeleton className="h-6 w-full" /></TD></TR>
              ) : history.length === 0 ? (
                <EmptyRow colSpan={7}>No saved estimates yet.</EmptyRow>
              ) : (
                history.map((h) => (
                  <TR key={h.id}>
                    <TD>{formatDate(h.created_at)}</TD>
                    <TD className="font-mono text-xs">{h.provider_slug} / {h.model_slug}</TD>
                    <TD className="text-right">{formatNumber(h.input_tokens)}</TD>
                    <TD className="text-right">{formatNumber(h.output_tokens)}</TD>
                    <TD className="text-right">{formatNumber(h.total_tokens)}</TD>
                    <TD className="text-right">{formatUSD(h.estimated_cost)}</TD>
                    <TD>
                      <button
                        onClick={() => deleteEstimate(h.id)}
                        className="text-xs text-neutral-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={bold ? 'font-semibold' : ''}>{value}</span>
    </div>
  );
}
