/**
 * Executable finance route-guard audit (no browser).
 * Asserts finance SPA routes are wrapped in ProtectedRoute with expected roles.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesPath = path.join(__dirname, '..', 'src', 'routes', 'AppRoutes.tsx');
const source = fs.readFileSync(routesPath, 'utf8');

const required = [
  { path: '/payments', roles: ['super_admin', 'admin', 'branch_manager', 'owner', 'student', 'parent'] },
  { path: '/finance', roles: ['super_admin', 'admin', 'branch_manager', 'owner'] },
  { path: '/payroll', roles: ['super_admin', 'admin', 'branch_manager', 'owner', 'teacher'] },
  { path: '/academy-financial-report', roles: ['super_admin', 'admin', 'branch_manager', 'owner'] },
  { path: '/expenses', roles: ['super_admin', 'admin', 'branch_manager', 'owner'] }
];

const failures = [];

for (const item of required) {
  const pathIndex = source.indexOf(`path="${item.path}"`);
  if (pathIndex < 0) {
    failures.push(`route ${item.path} not found`);
    continue;
  }
  const window = source.slice(pathIndex, pathIndex + 280);
  if (!window.includes('ProtectedRoute')) {
    failures.push(`${item.path} missing ProtectedRoute wrapper near declaration`);
  }
  for (const role of item.roles) {
    if (!window.includes(`'${role}'`)) {
      failures.push(`${item.path} missing expected role ${role}`);
    }
  }
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checkedRoutes: required.map((r) => r.path) }, null, 2));
