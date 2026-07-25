import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore.js';

/**
 * Entry route. The real decision lives in the auth gate in _layout.jsx; this
 * just sends the user somewhere sensible on first render.
 */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  return <Redirect href={status === 'authed' ? '/today' : '/onboarding'} />;
}
