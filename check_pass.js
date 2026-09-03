const bcrypt = require('bcryptjs');

async function check() {
  const hash = '$2b$10$.j.FbO/mDfdvK.xpPjwacuodARggzkIcdTU5D7IcUlStBOYUmurm2';
  const passwords = ['admin123', 'admin', 'password', '123456', 'stayu123', 'stayuadmin'];
  for (const p of passwords) {
    if (await bcrypt.compare(p, hash)) {
      console.log('Match found:', p);
      return;
    }
  }
  console.log('No match found');
}

check();
