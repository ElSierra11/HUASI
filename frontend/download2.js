import axios from 'axios';
import fs from 'fs';

const url = 'https://images.unsplash.com/photo-1596422846543-74c6fc08c02c?q=80&w=2000&auto=format&fit=crop';
const dest = './public/santa-marta-banner.jpg';

axios({
  url,
  method: 'GET',
  responseType: 'stream',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  }
}).then(response => {
  const writer = fs.createWriteStream(dest);
  response.data.pipe(writer);
  writer.on('finish', () => console.log('Download complete'));
  writer.on('error', (err) => console.error(err));
}).catch(err => {
  console.error('Download failed:', err.message);
});
