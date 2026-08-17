const fs = require('fs');
const { execSync } = require('child_process');

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));

const vars = {};
lines.forEach(l => {
  const i = l.indexOf('=');
  if (i > 0) {
    const k = l.slice(0, i).trim();
    let v = l.slice(i + 1).trim();
    // Remove surrounding quotes
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    vars[k] = v;
  }
});

// Override NEXT_PUBLIC_APP_URL to Vercel URL
vars['NEXT_PUBLIC_APP_URL'] = 'https://iti-jhansi-portal.vercel.app';

console.log(`Found ${Object.keys(vars).length} environment variables to set:`);
Object.keys(vars).forEach(k => {
  console.log(`  - ${k}: ${k.includes('SECRET') || k.includes('PASSWORD') || k.includes('URL') ? '***' : vars[k].substring(0, 20)}`);
});

// Set each env var using Vercel CLI
for (const [key, value] of Object.entries(vars)) {
  try {
    console.log(`\nSetting ${key}...`);
    // Use echo to pipe the value to vercel env add
    execSync(`echo ${JSON.stringify(value)} | npx vercel env add ${key} production`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd(),
      timeout: 30000,
    });
    console.log(`  ✓ ${key} set`);
  } catch (e) {
    console.error(`  ✗ ${key} failed: ${e.message.substring(0, 100)}`);
  }
}

console.log('\nDone! All environment variables set.');
