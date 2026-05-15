const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');

const app = express();
const dataFile = path.join(__dirname, 'data', 'shipments.json');
const publicFolder = path.join(__dirname, 'public');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'olaoseibikan232@gmail.com';

app.use(express.json());
app.use(express.static(publicFolder));

function ensureDataFile() {
  if (!fs.existsSync(dataFile)) {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify({ requests: [] }, null, 2), 'utf8');
  }
}

function loadData() {
  ensureDataFile();
  const raw = fs.readFileSync(dataFile, 'utf8');
  return JSON.parse(raw || '{"requests": []}');
}

function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

function createTrackingCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}

function createShipmentHistory(source, destination) {
  const now = new Date();
  return [
    {
      when: now.toLocaleString(),
      description: `Package collected at ${source}`,
    },
    {
      when: new Date(now.getTime() + 4 * 60 * 60 * 1000).toLocaleString(),
      description: `Package in transit between ${source} and ${destination}`,
    },
    {
      when: new Date(now.getTime() + 14 * 60 * 60 * 1000).toLocaleString(),
      description: `Expected to arrive at ${destination}`,
    },
  ];
}

app.post('/api/request', (req, res) => {
  const { name, surname, phone, email, source, destination, packageDetails } = req.body;
  if (!name || !surname || !phone || !email || !source || !destination || !packageDetails) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const data = loadData();
  const requestId = randomBytes(3).toString('hex');

  data.requests.push({
    id: requestId,
    name,
    surname,
    phone,
    email,
    source,
    destination,
    packageDetails,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  saveData(data);
  res.json({ requestId });
});

app.post('/api/admin/issue-code', (req, res) => {
  const adminEmail = req.headers['x-admin-email'];
  if (adminEmail !== ADMIN_EMAIL) {
    return res.status(401).json({ message: 'Unauthorized admin email.' });
  }

  const { requestId } = req.body;
  const data = loadData();
  const request = data.requests.find((item) => item.id === requestId);

  if (!request) {
    return res.status(404).json({ message: 'Request not found.' });
  }
  if (request.status !== 'pending') {
    return res.status(400).json({ message: 'Tracking code already issued.' });
  }

  const code = createTrackingCode();
  request.status = 'active';
  request.code = code;
  request.currentStatus = 'Package is on the way';
  request.history = createShipmentHistory(request.source, request.destination);
  request.issuedAt = new Date().toISOString();

  saveData(data);
  res.json({ code });
});

app.get('/api/admin/requests', (req, res) => {
  const adminEmail = req.headers['x-admin-email'];
  if (adminEmail !== ADMIN_EMAIL) {
    return res.status(401).json({ message: 'Unauthorized admin email.' });
  }

  const data = loadData();
  res.json({ requests: data.requests });
});

app.post('/api/track', (req, res) => {
  const { code, requestId, email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }
  if (!code && !requestId) {
    return res.status(400).json({ message: 'Either tracking code or request ID is required.' });
  }

  const data = loadData();
  let shipment;

  if (code) {
    shipment = data.requests.find((item) => item.code === code && item.email.toLowerCase() === email.toLowerCase());
  } else {
    shipment = data.requests.find((item) => item.id === requestId && item.email.toLowerCase() === email.toLowerCase());
  }

  if (!shipment) {
    return res.status(404).json({ message: 'Shipment not found with that code/request ID and email.' });
  }

  res.json({ shipment });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicFolder, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WayBill server running on http://localhost:${PORT}`);
});
