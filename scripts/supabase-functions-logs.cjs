#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const projectRef = process.env.SUPABASE_PROJECT_REF;

if (!projectRef) {
  console.error('Missing SUPABASE_PROJECT_REF environment variable.');
  console.error('Set it in your shell and retry.');
  process.exit(1);
}

const openDashboard = () => {
  const url = `https://supabase.com/dashboard/project/${projectRef}/functions`;
  console.log(`Supabase CLI no expone logs de funciones en esta versión.`);
  console.log(`Abre logs en Dashboard: ${url}`);

  const opener =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];

  const [cmd, args] = opener;
  spawnSync(cmd, args, { stdio: 'ignore', shell: process.platform === 'win32' });
};

const versionCheck = spawnSync('npx', ['supabase', 'functions', '--help'], {
  encoding: 'utf-8',
  shell: process.platform === 'win32',
});

if (versionCheck.error) {
  console.error(versionCheck.error.message);
  process.exit(1);
}

const hasLogsSubcommand = /\n\s+logs\s+/.test(versionCheck.stdout);

if (!hasLogsSubcommand) {
  openDashboard();
  process.exit(0);
}

const result = spawnSync('npx', ['supabase', 'functions', 'logs', '--project-ref', projectRef], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
