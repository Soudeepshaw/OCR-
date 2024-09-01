const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS if needed
app.use(cors());

// Set up multer for file uploads with size limit
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }  // Limit file size to 5MB
});

app.use(express.json());
app.use(express.static('public'));

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.resolve('./Views'));

// Test route - renders the EJS template
app.get('/', (req, res) => {
    res.render('index');
});

// Endpoint to handle file uploads and process OCR
app.post('/upload', upload.single('aadhaar'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const imagePath = path.join(__dirname, req.file.path);
    processOCR(imagePath)
        .then(data => {
            res.json(data);
            fs.unlink(imagePath, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        })
        .catch(err => res.status(500).json({ error: err.message }));
});

// Function to process the image with OCR and extract information
function processOCR(imagePath) {
    return new Promise((resolve, reject) => {
        Tesseract.recognize(imagePath, 'eng', { logger: m => console.log(m) })
            .then(result => {
                const text = result.data.text;
                if (!text) {
                    reject(new Error("OCR did not detect any text. Please ensure the image is clear and contains readable text."));
                    return;
                }
                console.log("OCR Result Text:", text);  // For debugging purposes
                const data = {
                    name: extractName(text),
                    aadhaarNumber: extractAadhaarNumber(text),
                    dob: extractDOB(text),
                    gender: extractGender(text)
                };
                console.log("Extracted Data:", data);
                resolve(data);
            })
            .catch(err => reject(err));
    });
}

// Functions to extract specific information using regular expressions
function extractName(text) {
    const nameMatch = text.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)/);
    return nameMatch ? nameMatch[1].trim() : 'Name not found';
}


function extractAadhaarNumber(text) {
    const aadhaarMatch = text.match(/\d{4}\s\d{4}\s\d{4}/);
    return aadhaarMatch ? aadhaarMatch[0] : 'Aadhaar number not found';
}

function extractDOB(text) {
    const dobMatch = text.match(/(?:DOB|Date of Birth|जन्म तिथि):\s*(\d{2}\/\d{2}\/\d{4})/i);
    return dobMatch ? dobMatch[1] : 'DOB not found';
}

function extractGender(text) {
    const genderMatch = text.match(/\b(MALE|FEMALE|Male|Female)\b/i);
    return genderMatch ? genderMatch[1].toUpperCase() : 'Gender not found';
}

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
