import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useLogin, useRegister } from '../api/hooks';
import { Frame } from '../components/AppShell';
import { Button, Field, FormError, Input, PageHeader } from '../components/ui';

export function LoginPage() {
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <Frame>
      <PageHeader back="/welcome" title="Welcome back" subtitle="Sign in to pick up your routine." />
      <form onSubmit={submit} className="grid gap-4 px-5 pt-2">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <FormError error={login.error} />
        <Button type="submit" size="lg" block loading={login.isPending} className="mt-2">
          Sign in
        </Button>
        <p className="text-center text-sm text-ink-soft">
          New to GripWise?{' '}
          <Link to="/register" className="font-semibold text-brand-700 underline-offset-2 hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </Frame>
  );
}

export function RegisterPage() {
  const register = useRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    register.mutate({ name, email, password });
  }

  return (
    <Frame>
      <PageHeader back="/welcome" title="Create your account" subtitle="It takes a minute. Your data stays private to you." />
      <form onSubmit={submit} className="grid gap-4 px-5 pt-2">
        <Field label="First name">
          <Input autoComplete="given-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <FormError error={register.error} />
        <Button type="submit" size="lg" block loading={register.isPending} className="mt-2">
          Create account
        </Button>
        <p className="text-center text-sm text-ink-soft">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand-700 underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </Frame>
  );
}
