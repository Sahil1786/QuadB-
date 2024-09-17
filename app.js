const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const app = express();
const port = 3000;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/crypto_data', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define the schema and model for the top cryptos
const cryptoSchema = new mongoose.Schema({
  name: String,
  last: Number,
  buy: Number,
  sell: Number,
  volume: Number,
  base_unit: String
});

const Crypto = mongoose.model('Crypto', cryptoSchema);

// Middleware to serve static files (for frontend)
app.use(express.static('public'));

// Fetch top 10 crypto data from the API and store in MongoDB
async function fetchAndStoreCryptoData() {
  try {
    const response = await axios.get('https://api.wazirx.com/api/v2/tickers');
    const tickers = response.data;
    
    // Extracting top 10 tickers
    const top10 = Object.values(tickers).slice(0, 10);

    // Insert data into MongoDB
    await Crypto.deleteMany({}); // Clear existing data
    for (const ticker of top10) {
      const { name, last, buy, sell, volume, base_unit } = ticker;
      const crypto = new Crypto({ name, last: parseFloat(last), buy: parseFloat(buy), sell: parseFloat(sell), volume: parseFloat(volume), base_unit });
      await crypto.save();
    }
    
    console.log('Top 10 crypto data successfully stored in MongoDB.');
  } catch (error) {
    console.error('Error fetching and storing crypto data:', error);
  }
}

// Route to get the stored data from MongoDB
app.get('/api/cryptos', async (req, res) => {
  try {
    const cryptos = await Crypto.find().limit(10);

    // Calculate difference and savings
    const updatedCryptos = cryptos.map((crypto) => {
      const difference = ((crypto.sell - crypto.buy) / crypto.buy) * 100; // Percentage difference
      const savings = crypto.sell - crypto.last; // Savings calculation
      return {
        ...crypto.toObject(),
        difference: difference.toFixed(2),
        savings: savings.toFixed(2)
      };
    });

    res.json(updatedCryptos);
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    res.status(500).send('Server Error');
  }
});

// Set up EJS for rendering views
app.set('view engine', 'ejs');

// Route to render the frontend
app.get('/', async (req, res) => {
  try {
    const platforms = await Crypto.find().limit(10); // Fetch the top 10 records from MongoDB
    const stats = [
      { percent: '0.1%', price: '26,56,110' },
      { percent: '0.96%', price: '26,56,110' },
      { percent: '2.73%', price: '26,56,110' },
      { percent: '7.51%', price: '26,56,110' }
    ]; // Example stats, you should calculate these based on your data

    res.render('index', { platforms, stats });
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    res.status(500).send('Server Error');
  }
});

// Start server and fetch data
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  fetchAndStoreCryptoData();
});
