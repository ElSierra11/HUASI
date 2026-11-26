const bcrypt = require('bcryptjs');

async function check() {
  const hash = process.env.TEST_BCRYPT_HASH;
  if (!hash) {
    console.log('Set TEST_BCRYPT_HASH env var to test');
    return;
  }
  const passwords = (process.env.TEST_PASSWORDS || '').split(',').filter(Boolean);
  for (const p of passwords) {
    if (await bcrypt.compare(p, hash)) {
      console.log('Match found:', p);
      return;
    }
  }
  console.log('No match found');
}

void check();
