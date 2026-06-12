const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function executeCode({ language, code, stdin = '', version = '*' }) {
  const res = await fetch(`${API_BASE_URL}/api/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, code, stdin, version }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      success: false,
      output: data.error || `Execution failed: ${res.status} ${res.statusText}`,
    };
  }

  if (data?.run) {
    return {
      success: true,
      output:
        data.run.output || data.run.stdout || data.run.stderr || 'No run output',
      raw: data,
    };
  }

  if (data?.compile) {
    return {
      success: true,
      output:
        data.compile.output ||
        data.compile.stdout ||
        data.compile.stderr ||
        'No compile output',
      raw: data,
    };
  }

  return {
    success: true,
    output: typeof data === 'object' ? JSON.stringify(data) : String(data),
  };
}
