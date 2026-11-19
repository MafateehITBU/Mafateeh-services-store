export function logServer(event: string, fields: Record<string, string | number | boolean> = {}) {
  const safe: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (!/email|phone|password|secret|token|name|address/i.test(key)) {
      safe[key] = value;
    }
  }

  console.log(JSON.stringify({ event, ...safe, at: new Date().toISOString() }));
}
