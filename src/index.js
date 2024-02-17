const { once } = require('events');
const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');
const express = require('express');
const sharp = require('sharp');



const app = express()
const port = 3000
const tempDir = "temp";

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}
console.log(process.cwd());


app.get('/', async (req, res) => {
    const url = req.query["link"];
    const width = parseInt(req.query["width"] ?? 500);
    const height = parseInt(req.query["height"] ?? 375);
    if (url) {
        try {
            const imgFile = await main(url, width, height);
            res.download(imgFile);
            setTimeout(() => {
                try {
                    console.log("Unlinking file: " + imgFile)
                    fs.unlinkSync(imgFile);
                } catch (error) {
                    console.error(error);
                }
            }, 5000);
        } catch (error) {
            console.error(error);
            res.send("Er is een fout op getreden.");
        }
    } else {
        res.sendStatus(500);
    }

})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})


async function main(url, width, height) {

    // let url = process.argv[2];
    let selector = "div[data-test='current-image'] img";
    let attr = "src";

    const r = await axios.get(url, {
        headers: {
            'Accept': 'text/html'
        }
    });

    const $ = cheerio.load(r.data);
    const imgUrl = $(selector).attr(attr);
    let alt = $(selector).attr("alt").replaceAll(" ", "_").replaceAll("\\", "").replaceAll("/", "").replaceAll("-", "").toLowerCase();
    if (alt.length > 50) alt = alt.substring(0, 50);
    console.log(alt);

    const imgType = imgUrl.split(".").pop();
    const fullImageName = tempDir + "/" + alt + "." + imgType;

    const response = await axios({
        method: "get",
        url: imgUrl,
        responseType: "stream"
    })
    let stream = response.data.pipe(fs.createWriteStream(fullImageName));
    await once(stream, 'finish');

    const buf = await sharp(fullImageName).resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).toBuffer();
    fs.writeFileSync(fullImageName, buf);

    return fullImageName;
}


// main();