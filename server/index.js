const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for frontend-backend communication
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/webapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  creditScore: Number,
  creditLines: Number,
  maskedPhoneNumber: String
});

const User = mongoose.model('User', userSchema);

// Set up multer for file uploads with increased file size limit
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB file size limit
});

// Endpoint to upload CSV files
app.post('/upload', upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send('No file uploaded.');
      }
  
      const filePath = path.join(__dirname, 'uploads', 'user_data.csv');
      const results = [];
  
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          results.push({
            email: data.Email,
            name: data.Name,
            creditScore: parseInt(data.CreditScore, 10),
            creditLines: parseInt(data.CreditLines, 10),
            maskedPhoneNumber: data.MaskedPhoneNumber
          });
        })
        .on('end', async () => {
          try {
            const insertedDocs = await User.insertMany(results);
            res.json(insertedDocs);
          } catch (err) {
            console.error('Error saving data to MongoDB:', err);
            res.status(500).send('Internal server error.');
          }
        });
    } catch (err) {
      console.error('Error uploading file:', err);
      res.status(500).send('Internal server error.');
    }
  });
  
// Endpoint to get paginated data
app.get('/data', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const users = await User.find().skip(skip).limit(limit);
    const total = await User.countDocuments();

    res.json({ data: users, total });
  } catch (err) {
    console.error('Error fetching data from MongoDB:', err);
    res.status(500).send('Internal server error.');
  }
});

app.get('/', (req, res) => {
  res.send('Welcome to the Data-Driven Web Application!');
});

// Serve static files from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
