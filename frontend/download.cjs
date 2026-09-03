const https = require('https');
const fs = require('fs');

const url = 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Bahia_de_Santa_Marta.jpg';
const dest = './public/santa-marta-banner.jpg';

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
};

https.get(url, options, (res) => {
  if (res.statusCode === 200) {
    const file = fs.createWriteStream(dest);
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Download completed.');
    });
  } else if (res.statusCode === 301 || res.statusCode === 302) {
    console.log('Redirecting to: ', res.headers.location);
    https.get(res.headers.location, options, (res2) => {
        const file = fs.createWriteStream(dest);
        res2.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Download completed after redirect.');
        });
    });
  } else {
    console.log('Failed: ', res.statusCode);
  }
}).on('error', (err) => {
  console.log('Error: ', err.message);
});
