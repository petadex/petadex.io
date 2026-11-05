/**
 * Generate docs/API_DATABASE_DEPENDENCIES.md (published to the wiki's
 * API-Documentation page by .github/workflows/api-documentation.yml).
 *
 * Paths come from the live Express app (src/app.js) rather than from file
 * names, so mount prefixes are exactly what is served — e.g. annotation.js is
 * mounted at /api, searchRelays.js exports two routers at /api/search/samples
 * and /api/search/align. SQL dependencies are read from each handler's source
 * text; handlers that delegate to a lib/ helper show "—" for tables.
 *
 * Run: cd backend && npm run docs:api
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '../docs/API_DATABASE_DEPENDENCIES.md');

const { default: app } = await import('../src/app.js');

/** Express 4 stores the mount path only as a regexp: ^\/api\/fastaa\/?(?=\/|$) */
function mountPath(layer) {
  if (layer.path) return layer.path;
  const src = layer.regexp?.source ?? '';
  if (layer.regexp?.fast_slash) return '';
  return src
    .replace(/^\^/, '')
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/i, '')
    .replace(/\\\//g, '/');
}

function collectRoutes() {
  const stack = (app._router ?? app.router).stack;
  const routes = [];
  for (const layer of stack) {
    if (layer.route) {
      routes.push(...fromRoute(layer.route, ''));
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const base = mountPath(layer);
      for (const sub of layer.handle.stack) {
        if (sub.route) routes.push(...fromRoute(sub.route, base));
      }
    }
  }
  return routes;
}

function fromRoute(route, base) {
  const fullPath = (base + (route.path === '/' && base ? '' : route.path)) || '/';
  const source = route.stack.map((l) => l.handle.toString()).join('\n');
  return Object.keys(route.methods).map((m) => ({
    method: m.toUpperCase(),
    path: fullPath,
    group: groupOf(fullPath),
    params: [...fullPath.matchAll(/:(\w+)/g)].map((x) => x[1]),
    queries: [...source.matchAll(/pool\.query\(\s*(['"`])([\s\S]*?)\1/g)].map((x) => x[2].trim()),
  }));
}

/** Section heading: first path segment after /api (or "root" for /, /health). */
function groupOf(p) {
  const seg = p.replace(/^\/api\/?/, '').split('/')[0];
  return p.startsWith('/api') && seg ? seg : 'root';
}

function extractDependencies(queries) {
  const tables = new Set();
  const columns = new Map();
  for (const q of queries) {
    for (const m of q.matchAll(/(?:FROM|JOIN)\s+(?:public\.)?(\w+)/gi)) tables.add(m[1].toLowerCase());
    for (const m of q.matchAll(/\b([a-z_]\w*)\.("?[\w]+"?)/gi)) {
      const t = m[1].toLowerCase();
      if (t === 'public') continue;
      if (!columns.has(t)) columns.set(t, new Set());
      columns.get(t).add(m[2].toLowerCase());
    }
    if (/SELECT\s+\*/i.test(q)) tables.forEach((t) => columns.has(t) || columns.set(t, new Set(['*'])));
  }
  return {
    tables: [...tables],
    columns: Object.fromEntries([...columns].map(([k, v]) => [k, [...v]])),
  };
}

function generateMarkdown(routes) {
  const now = new Date().toISOString().split('T')[0];
  let md = `# PETadex API - Database Dependencies

**Auto-generated**: ${now}
**Purpose**: Maps API endpoints to database tables/columns to identify breaking changes

---

## Quick Reference

| Endpoint | Method | Tables |
|----------|--------|--------|
`;
  for (const r of routes) {
    md += `| \`${r.path}\` | ${r.method} | ${extractDependencies(r.queries).tables.join(', ') || '—'} |\n`;
  }
  md += `\n---\n\n`;

  const groups = [...new Set(routes.map((r) => r.group))];
  for (const g of groups) {
    md += `## /${g === 'root' ? '' : `api/${g}`}\n\n`;
    for (const r of routes.filter((x) => x.group === g)) {
      md += `### ${r.method} \`${r.path}\`\n\n`;
      if (r.params.length) md += `**Parameters**: ${r.params.map((p) => `\`${p}\``).join(', ')}\n\n`;
      const deps = extractDependencies(r.queries);
      md += `**Tables**: ${deps.tables.join(', ') || '—'}\n\n`;
      const cols = Object.entries(deps.columns);
      if (cols.length) {
        md += `**Columns**:\n`;
        for (const [t, c] of cols) md += `- \`${t}\`: ${c.join(', ')}\n`;
        md += `\n`;
      }
      if (r.queries.length) {
        md += `<details>\n<summary>SQL Query</summary>\n\n\`\`\`sql\n${r.queries[0]}\n\`\`\`\n</details>\n\n`;
      }
      md += `---\n\n`;
    }
  }
  md += `*Generated from the mounted Express app by backend/scripts/generate-api-docs.js*\n`;
  return md;
}

const routes = collectRoutes();
fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, generateMarkdown(routes), 'utf-8');
console.log(`Documented ${routes.length} endpoints -> ${path.relative(process.cwd(), OUTPUT_FILE)}`);
process.exit(0); // the pg pool / AWS clients would otherwise keep the process alive
