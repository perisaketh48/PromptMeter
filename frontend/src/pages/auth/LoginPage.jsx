import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Input.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { extractError } from '../../api/client.js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/';

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login({ email, password });
      toast.success('Welcome back.');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(extractError(err, 'Sign-in failed.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-neutral-500">Welcome back to your platform.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            value={email}
            autoComplete="email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
        <Button type="submit" loading={submitting} className="w-full">
          Sign in
        </Button>
      </form>
      <div className="text-center text-sm text-neutral-500">
        New here?{' '}
        <Link to="/register" className="underline text-neutral-900 dark:text-neutral-100">
          Create an account
        </Link>
      </div>
    </div>
  );
}
