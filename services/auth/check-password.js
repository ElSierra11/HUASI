const bcrypt = require('bcrypt');

const hash = process.env.TEST_BCRYPT_HASH || '';
const passwords = (process.env.TEST_PASSWORDS || '').split(',').filter(Boolean);

async function main() {
  for (const pw of passwords) {
    const match = await bcrypt.compare(pw, hash);
    console.log(`Password "${pw}" matches?`, match);
  }
}

main();
