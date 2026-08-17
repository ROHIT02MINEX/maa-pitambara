const fs = require('fs');
const { execSync } = require('child_process');

// Read DATABASE_URL from .env
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
if (!match) { console.error('DATABASE_URL not found'); process.exit(1); }

const dbUrl = match[1];
console.log('DATABASE_URL (masked):', dbUrl.replace(/:[^:@]+@/, ':***@'));

// Remove old and add new
try {
  console.log('Removing old DATABASE_URL...');
  execSync('npx vercel env rm DATABASE_URL production --yes', { stdio: 'pipe', timeout: 15000 });
  console.log('  Removed.');
} catch(e) { console.log('  Not found or already removed.'); }

try {
  console.log('Adding new DATABASE_URL...');
  execSync(`echo ${JSON.stringify(dbUrl)} | npx vercel env add DATABASE_URL production`, { stdio: 'pipe', timeout: 15000 });
  console.log('  ✓ Set.');
} catch(e) { console.error('  ✗ Failed:', e.message.substring(0, 100)); }

console.log('\nDone! Now redeploy to apply.');
