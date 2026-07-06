import https from 'https';

https.get('https://cdn.pixabay.com/photo/2020/01/22/18/23/santa-marta-4785964_1280.jpg', (res) => {
  console.log(res.statusCode);
}).on('error', (e) => {
  console.error(e);
});
