const express = require('express');
const multer = require('multer');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const fontkit = require('fontkit');
const { Document, Packer } = require('docx');
const mammoth = require('mammoth');

const JsGoogleTranslateFree = require("@kreisler/js-google-translate-free");
const app = express();
const upload = multer({ dest: 'uploads/' });
const pdf = require('pdf-parse');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/upload', upload.single('file'), async (req, res) => {
  const { text, from, to } = req.body;
  let textToTranslate;
  if (req.file) {
    const filePath = req.file.path;
    if (req.file.originalname.endsWith('.pdf')) {
      try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        textToTranslate = data.text;
      } catch (error) {
        console.error('Fehler beim Lesen der PDF:', error.message);
        return res.status(500).send('Fehler beim Lesen der PDF');
      }
    } else if (req.file.originalname.endsWith('.docx')) {
      try {
        const dataBuffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer: dataBuffer });
        textToTranslate = result.value;
      } catch (error) {
        console.error('Fehler beim Lesen der DOCX:', error.message);
        return res.status(500).send('Fehler beim Lesen der DOCX');
      }
    } else {
      textToTranslate = fs.readFileSync(filePath, 'utf-8');
    }

    fs.unlinkSync(filePath);
  } else {
    textToTranslate = text;
  }

  try {
    const translatedText = await translateText(textToTranslate, from, to);
    res.json({ translatedText });
  } catch (error) {
    console.error('Fehler bei der Übersetzung:', error.message);
    res.status(500).send('Fehler bei der Übersetzung');
  }
});

app.post('/upload-file-to-file', upload.single('file'), async (req, res) => {
  const { text, from, to } = req.body;
  let textToTranslate;
  if (req.file) {
    const filePath = req.file.path;
    if (req.file.originalname.endsWith('.pdf')) {
      try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        textToTranslate = data.text;
      } catch (error) {
        console.error('Fehler beim Lesen der PDF:', error.message);
        return res.status(500).send('Fehler beim Lesen der PDF');
      }
    } else if (req.file.originalname.endsWith('.docx')) {
      try {
        const dataBuffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer: dataBuffer });
        textToTranslate = result.value;
      } catch (error) {
        console.error('Fehler beim Lesen der DOCX:', error.message);
        return res.status(500).send('Fehler beim Lesen der DOCX');
      }
    } else {
      textToTranslate = fs.readFileSync(filePath, 'utf-8');
    }

    fs.unlinkSync(filePath);
  } else {
    textToTranslate = text;
  }

  try {
    const translatedText = await translateText(textToTranslate, from, to);
    res.json({ translatedText });
  } catch (error) {
    console.error('Fehler bei der Übersetzung:', error.message);
    res.status(500).send('Fehler bei der Übersetzung');
  }
});

async function translateText(textToTranslate, fromLang, toLang) {
  try {
    if (!fromLang || !toLang || !textToTranslate) {
      console.error('Missing translation parameters');
      return textToTranslate;
    }

    const from = fromLang;
    const to = toLang;
    // Split the text into lines
    const lines = textToTranslate.split('\n');

    // Define a regex pattern for URLs
    const urlPattern = /(https?:\/\/[^\s]+)/g;

    // Translate each line individually, unless it's undefined or a URL
    const translatedLines = await Promise.all(lines.map(async (line) => {
      if (!line || urlPattern.test(line) || line === ' ' || line === '') {
        return line;
      }

      try {
        return await JsGoogleTranslateFree.translate({text: line, from, to});
      } catch (error) {
        console.error('Translation error for line:', line, error.message);
        return line;
      }
    }));

    return translatedLines.join('\n');
  } catch (error) {
    console.error('Übersetzungsfehler:', error.message);
    throw new Error('Übersetzungsfehler');
  }
}

app.post('/download-pdf', async (req, res) => {
  const translatedText = req.body.translatedText;

  try {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    let page = pdfDoc.addPage([595.276, 841.890]);
    const { width, height } = page.getSize();
    const fontSize = 12;
    const margin = 10;
    const maxWidth = width - 2 * margin;
    const lineHeight = fontSize;
    let y = height - margin;

    const fontPath = path.join(__dirname, 'public', 'fonts', 'DejaVuSans.ttf');
    const fontBytes = fs.readFileSync(fontPath);
    const font = await pdfDoc.embedFont(fontBytes);
    const lines = breakTextIntoLines(translatedText, maxWidth, fontSize, font);

    for (const line of lines) {
      if (y - lineHeight < margin) {
        page = pdfDoc.addPage();
        y = height - margin;
      }
      page.drawText(line, {
        x: margin,
        y: y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0)
      });
      y -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Disposition', 'attachment; filename=translated.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Fehler beim Erstellen der PDF:', error.message);
    res.status(500).send('Fehler beim Erstellen der PDF');
  }
});

function breakTextIntoLines(text, maxWidth, fontSize, font) {
  const paragraphs = text.split('\n');
  const lines = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let line = '';

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && line !== '') {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) {
      lines.push(line);
    }

    lines.push('');
  }
  return lines;
}

app.listen(3000, () => {
  console.log('Server läuft auf http://localhost:3000');
});
