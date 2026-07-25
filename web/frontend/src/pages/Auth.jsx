import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Envelope, Lock, User as UserIcon, Eye, EyeSlash } from '@phosphor-icons/react';

import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { BrandMark } from '../components/illustrations/Illustrations.jsx';
import { useAuthStore } from '../store/authStore.js';
import { errorMessage, fieldErrors } from '../api/client.js';

/**
 * Sign in / sign up (brief §04, "Login / Sign Up").
 *
 * Email and password only, as agreed. The layout keeps a slot for social
 * providers so adding Google or Apple later is a component drop-in rather than
 * a redesign.
 */

function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)] px-6 py-10">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="mb-8 text-center">
          <BrandMark size={44} className="mx-auto" />
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-[var(--text)]">{title}</h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">{subtitle}</p>
        </div>

        <div className="card p-6">{children}</div>

        {footer && <div className="mt-6 text-center text-[0.8125rem] text-[var(--text-muted)]">{footer}</div>}
      </div>
    </div>
  );
}

/** Password field with a show/hide toggle. */
function PasswordInput({ label = 'Password', ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input label={label} type={visible ? 'text' : 'password'} icon={Lock} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-[2.15rem] rounded-md p-1 text-[var(--text-subtle)] transition-colors hover:text-[var(--text)]"
      >
        {visible ? <EyeSlash size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setLoading(true);

    try {
      await login(form);
      // Return the user to wherever they were headed before the redirect.
      navigate(location.state?.from ?? '/today', { replace: true });
    } catch (error) {
      setErrors(fieldErrors(error));
      setFormError(errorMessage(error, 'Could not sign you in'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up your streaks"
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-semibold text-[var(--accent-strong)] hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div role="alert" className="rounded-[11px] bg-[var(--danger-soft)] px-3.5 py-2.5 text-[0.8125rem] font-medium text-[var(--danger)]">
            {formError}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          icon={Envelope}
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          required
        />

        <PasswordInput
          placeholder="Your password"
          autoComplete="current-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          required
        />

        <Button type="submit" size="lg" fullWidth loading={loading}>
          Sign in
        </Button>
      </form>

      {/* Demo credentials — remove this block before a production deploy. */}
      <div className="mt-5 rounded-[11px] border border-dashed border-[var(--border-strong)] px-3.5 py-3">
        <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--text-subtle)]">
          Demo account
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          demo@asensebranding.com · Password123
        </p>
        <button
          type="button"
          onClick={() => setForm({ email: 'demo@asensebranding.com', password: 'Password123' })}
          className="mt-1.5 text-xs font-semibold text-[var(--accent-strong)] hover:underline"
        >
          Fill in demo credentials
        </button>
      </div>
    </AuthLayout>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const signup = useAuthStore((state) => state.signup);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setLoading(true);

    try {
      await signup(form);
      navigate('/today', { replace: true });
    } catch (error) {
      setErrors(fieldErrors(error));
      setFormError(errorMessage(error, 'Could not create your account'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Start your first streak"
      subtitle="Free, and takes about twenty seconds"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[var(--accent-strong)] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div role="alert" className="rounded-[11px] bg-[var(--danger-soft)] px-3.5 py-2.5 text-[0.8125rem] font-medium text-[var(--danger)]">
            {formError}
          </div>
        )}

        <Input
          label="Name"
          icon={UserIcon}
          placeholder="What should we call you?"
          autoComplete="name"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          required
        />

        <Input
          label="Email"
          type="email"
          icon={Envelope}
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          required
        />

        <PasswordInput
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint="8+ characters, with a letter and a number"
          required
        />

        <Button type="submit" size="lg" fullWidth loading={loading}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
