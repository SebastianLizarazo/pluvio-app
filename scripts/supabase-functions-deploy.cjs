#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

// Load .env.local manually for Windows compatibility
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = val;
  });
}

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
if (second !== 0) process.exit(second);

const third = deployOne('sync-measurements');
process.exit(third);
