// temporary page used to simulate error codes in production/test deployments
// usage: /en/error-test?code=500 or 404 or 429 or 503 or offline

interface ErrorTestProps {
  searchParams: { code?: string };
}

export default function ErrorTest({ searchParams }: ErrorTestProps) {
  const code = searchParams.code || '500';

  // "offline" treated specially, map to status 0
  if (code === 'offline') {
    throw new Response('Network offline', { status: 0 });
  }

  const status = parseInt(code, 10) || 500;
  throw new Response('testing', { status });
}
