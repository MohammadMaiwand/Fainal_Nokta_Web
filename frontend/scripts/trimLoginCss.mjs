import fs from 'node:fs';

const filePath = 'src/styles/components/index.css';
const text = fs.readFileSync(filePath, 'utf8');
const start = text.indexOf('  .login-page-split {');
const end = text.indexOf('  .theme-toggle {');

if (start < 0 || end < 0) {
  console.error('Could not find login CSS markers', { start, end });
  process.exit(1);
}

const replacement = `  .login-page-shell {
    min-height: calc(100vh - 5rem);
    padding: 1.5rem 1rem;
  }

  .login-form-panel {
    width: 100%;
    max-width: 28rem;
  }

`;

fs.writeFileSync(filePath, `${text.slice(0, start)}${replacement}${text.slice(end)}`);
console.log('Trimmed login animation CSS.');
