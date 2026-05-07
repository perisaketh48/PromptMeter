import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Input.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { extractError } from '../../api/client.js';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', full_name: '', password: '', password_confirm: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm((curr) => ({ ...curr, [field]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await register(form);
      toast.success('Account created.');
      navigate('/', { replace: true });
    } catch (err) {
      setError(extractError(err, 'Sign-up failed.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="text-sm text-neutral-500">Start estimating in under a minute.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name" htmlFor="full_name">
          <Input id="full_name" value={form.full_name} onChange={update('full_name')} required autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" value={form.email} onChange={update('email')} required autoComplete="email" />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 10 characters.">
          <Input id="password" type="password" value={form.password} onChange={update('password')} required autoComplete="new-password" />
        </Field>
        <Field label="Confirm password" htmlFor="password_confirm">
          <Input id="password_confirm" type="password" value={form.password_confirm} onChange={update('password_confirm')} required autoComplete="new-password" />
        </Field>
        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
        <Button type="submit" loading={submitting} className="w-full">
          Create account
        </Button>
      </form>
      <div className="text-center text-sm text-neutral-500">
        Already have an account?{' '}
        <Link to="/login" className="underline text-neutral-900 dark:text-neutral-100">
          Sign in
        </Link>
      </div>
    </div>
  );
}
