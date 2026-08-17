const BASE = 'https://iti-jhansi-portal.vercel.app';

const tests = [
  { name: 'Health API', url: '/api/health', expect: '"status":"ok"' },
  { name: 'Homepage', url: '/', expect: 'Maa Pitambra' },
  { name: 'Login page', url: '/login', expect: 'Sign in' },
  { name: 'Signup page', url: '/signup', expect: 'Create' },
  { name: 'Forgot password', url: '/forgot-password', expect: 'Reset' },
  { name: 'Auth API (CSRF)', url: '/api/auth/csrf', expect: 'csrfToken' },
  { name: 'Auth Providers', url: '/api/auth/providers', expect: 'credentials' },
];

async function runTests() {
  console.log('='.repeat(60));
  console.log('  ITI JHANSI PORTAL - LIVE SITE TEST REPORT');
  console.log('  URL: ' + BASE);
  console.log('  Time: ' + new Date().toISOString());
  console.log('='.repeat(60));
  console.log('');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const url = BASE + test.url;
    const start = Date.now();
    try {
      const res = await fetch(url, { 
        redirect: 'manual',
        headers: { 'User-Agent': 'ITI-Portal-Test/1.0' }
      });
      const elapsed = Date.now() - start;
      const body = await res.text();
      const statusOk = res.status >= 200 && res.status < 400;
      const contentOk = body.includes(test.expect);
      const pass = statusOk && contentOk;

      if (pass) {
        console.log(`  ✅ PASS  ${test.name}`);
        console.log(`          Status: ${res.status} | Time: ${elapsed}ms | Content: found "${test.expect}"`);
        passed++;
      } else {
        console.log(`  ❌ FAIL  ${test.name}`);
        console.log(`          Status: ${res.status} | Time: ${elapsed}ms`);
        console.log(`          Expected "${test.expect}" in response: ${contentOk ? 'YES' : 'NO'}`);
        console.log(`          Body preview: ${body.substring(0, 200)}`);
        failed++;
      }
    } catch (err) {
      console.log(`  ❌ FAIL  ${test.name}`);
      console.log(`          Error: ${err.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${tests.length} total`);
  console.log('='.repeat(60));
  
  // Run tests a second time for reliability check
  console.log('\n\n--- SECOND RUN (reliability check) ---\n');
  
  let passed2 = 0;
  let failed2 = 0;
  
  for (const test of tests) {
    const url = BASE + test.url;
    const start = Date.now();
    try {
      const res = await fetch(url, { 
        redirect: 'manual',
        headers: { 'User-Agent': 'ITI-Portal-Test/1.0' }
      });
      const elapsed = Date.now() - start;
      const body = await res.text();
      const statusOk = res.status >= 200 && res.status < 400;
      const contentOk = body.includes(test.expect);
      const pass = statusOk && contentOk;

      if (pass) {
        console.log(`  ✅ PASS  ${test.name} (${elapsed}ms)`);
        passed2++;
      } else {
        console.log(`  ❌ FAIL  ${test.name} - Status: ${res.status}`);
        failed2++;
      }
    } catch (err) {
      console.log(`  ❌ FAIL  ${test.name} - ${err.message}`);
      failed2++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  RUN 2 RESULTS: ${passed2} passed, ${failed2} failed, ${tests.length} total`);
  console.log('='.repeat(60));
}

runTests();
