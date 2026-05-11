#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const projectRef = process.env.SUPABASE_PROJECT_REF;

if (!projectRef) {
  console.error('Missing SUPABASE_PROJECT_REF environment variable.');
  console.error('Set it in your shell and retry.');
  process.exit(1);
}

const deployOne = (fnName) => {
  const result = spawnSync('npx', ['supabase', 'functions', 'deploy', fnName, '--project-ref', projectRef], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return result.status ?? 1;
};

const first = deployOne('weekly-admin-summary');
if (first !== 0) process.exit(first);

const second = deployOne('user-status-notify');
process.exit(second);
