const https = require('https')
const url = require('url')

const fetch = (srcUrl, init) => {
  let parsedUrl = url.parse(srcUrl)
  let options = init && init.toString() === '[object Object]' ? {
    host: parsedUrl.host,
    path: parsedUrl.path,
    ...init
  } : {
    host: parsedUrl.host,
    path: parsedUrl.path
  }

  let data = ''
  return new Promise((resolve, reject) => {
    let req = https.request(options, (res) => {
      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        resolve(data)
      })

      res.on('error', (err) => {
        reject(err)
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.end()


  })
}

module.exports = fetch
