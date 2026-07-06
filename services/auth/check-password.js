const bcrypt = require('bcrypt');

const hash = '$2b$10$XJs29.FtjIjeXpzfXPo.V.XaHmPVWQWwBsdGwHdMh3oKarIfKxC/m';
const passwords = ['Admin123', 'admin123', 'admin', 'password', 'stayu', 'StayU123'];

async function main() {
  for (const pw of passwords) {
    const match = await bcrypt.compare(pw, hash);
    console.log(`Password "${pw}" matches?`, match);
  }
}

main();
