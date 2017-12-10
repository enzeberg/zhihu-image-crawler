const https = require('https')
const cheerio = require('cheerio')
const fs = require('fs')
const pug = require('pug')
const fetch = require('./fetch')
const config = require('./config')
const { shouldOutputHtml, shouldOutputImages, htmlDir, imagesDir } = config
const questionID = process.argv[2] ? process.argv[2] : config.questionID
const questionUrl = `https://www.zhihu.com/question/${questionID}`
var questionTitle

if (shouldOutputHtml && !fs.existsSync(htmlDir)) {
  fs.mkdirSync(htmlDir)
}
const specificImagesDir = `${imagesDir}/${questionID}`
if (shouldOutputImages && !fs.existsSync(specificImagesDir)) {
  fs.mkdirSync(specificImagesDir)
}

fetch(questionUrl)
  .then((result) => {
    // console.log(result)
    let $ = cheerio.load(result)
    questionTitle = $('title').text()
    let data = $('#data').attr('data-state')
    let state = JSON.parse(data)
    // console.log(state)
    let question = state.entities.questions[questionID]
    let answerCount = question.answerCount
    console.log('The number of answers: ', answerCount)
    // console.log(question)
    crawl(questionID, 0, answerCount)
  })
  .catch((err) => {
    console.error(err)
  })

let totalImages = []
function crawl(questionID, offset, answerCount) {
  console.log('offset: ', offset)
  if (offset < answerCount) {
    let apiUrl = `https://www.zhihu.com/api/v4/questions/${questionID}/answers?sort_by=default&include=data%5B%2A%5D.is_normal%2Cadmin_closed_comment%2Creward_info%2Cis_collapsed%2Cannotation_action%2Cannotation_detail%2Ccollapse_reason%2Cis_sticky%2Ccollapsed_by%2Csuggest_edit%2Ccomment_count%2Ccan_comment%2Ccontent%2Ceditable_content%2Cvoteup_count%2Creshipment_settings%2Ccomment_permission%2Ccreated_time%2Cupdated_time%2Creview_info%2Cquestion%2Cexcerpt%2Crelationship.is_authorized%2Cis_author%2Cvoting%2Cis_thanked%2Cis_nothelp%2Cupvoted_followees%3Bdata%5B%2A%5D.mark_infos%5B%2A%5D.url%3Bdata%5B%2A%5D.author.follower_count%2Cbadge%5B%3F%28type%3Dbest_answerer%29%5D.topics&limit=20&offset=${offset}`

    fetch(apiUrl, {
      headers: {
        authorization: 'oauth c3cef7c66a1843f8b3a9e6a1e3160e20',
      },
    })
      .then((result) => {
        // console.log(JSON.parse(result))
        let parsed = JSON.parse(result)
        parsed.data.forEach((answer) => {
          totalImages = totalImages.concat(getImagesFromAnswer(answer))
        })

        crawl(questionID, offset + 20, answerCount)
      })
      .catch((err) => {
        console.error(err)
      })
  } else {
    if (shouldOutputHtml) {
      console.log(`Building "${questionID}.html"...`)
      const html = pug.renderFile('./template.pug', {
        questionTitle: questionTitle,
        images: totalImages
      })
      const writeStream = fs.createWriteStream(`${htmlDir}/${questionID}.html`)
      writeStream.write(html, () => {
        console.log('Build html success!')
      })
      writeStream.end()
    }
  }
}


function getImagesFromAnswer(answer) {
  let images = []
  let $ = cheerio.load(answer.content)
  // <img> in <noscript> will not be queried
  $('img').each((index, item) => {
     // data-actualsrc or data-original
    let imgSrc = $(item).attr('data-actualsrc')
    if (imgSrc) {
      images.push(imgSrc)
      if (shouldOutputImages) {
        let fileName = imgSrc.split('/').pop()
        downloadImage(imgSrc, `${specificImagesDir}/${fileName}`)
      }
    }
  })
  return images
}

function downloadImage(src, dest) {
  console.log(`Start downloading: ${src}`)

  let writeStream = fs.createWriteStream(dest)
  https.get(src, (res) => {
    res.on('data', (data) => {
      if (writeStream.write(data) === false) {
        res.pause()
      }
    })
    res.on('end', () => {
      writeStream.end()
      console.log(`Download ${src} success!`)
    })
    writeStream.on('drain', () => {
      res.resume()
    })

  }).on('error', (err) => {
    console.error(err)
  }).end()

}
