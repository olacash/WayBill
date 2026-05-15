const ADMIN_EMAIL = 'olaoseibikan232@gmail.com';

const showMessage = (selector, text) => {
  const element = document.querySelector(selector);
  if (!element) return;
  element.textContent = text;
  element.style.display = text ? 'block' : 'none';
};

const isAdminAuthenticated = () => window.localStorage.getItem('adminEmail') === ADMIN_EMAIL;
const setAdminAuthenticated = () => window.localStorage.setItem('adminEmail', ADMIN_EMAIL);
const clearAdminAuthentication = () => window.localStorage.removeItem('adminEmail');
const getAdminHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Admin-Email': ADMIN_EMAIL,
});

const buildCard = (title, fields) => {
  return `
    <div class="request-card">
      <strong>${title}</strong>
      ${fields.map(field => `<p><strong>${field.label}</strong> ${field.value}</p>`).join('')}
    </div>
  `;
};

const createStatusBadge = (status) => {
  return `<span class="status-badge status-${status}">${status}</span>`;
};

const renderTrackResult = (shipment) => {
  if (shipment.status === 'pending') {
    return `
      <div class="shipment-card">
        <p><strong>Request ID:</strong> ${shipment.id}</p>
        <p><strong>Name:</strong> ${shipment.name} ${shipment.surname}</p>
        <p><strong>Email:</strong> ${shipment.email}</p>
        <p><strong>Phone:</strong> ${shipment.phone}</p>
        <p><strong>Source:</strong> ${shipment.source}</p>
        <p><strong>Destination:</strong> ${shipment.destination}</p>
        <p><strong>Package details:</strong> ${shipment.packageDetails}</p>
        <p><strong>Status:</strong> Pending admin approval. Tracking code will be issued soon.</p>
      </div>
    `;
  }

  const history = shipment.history.map(step => `<li class="track-step"><strong>${step.when}</strong>: ${step.description}</li>`).join('');
  return `
    <div class="shipment-card">
      <p><strong>Tracking code:</strong> ${shipment.code}</p>
      <p><strong>Name:</strong> ${shipment.name} ${shipment.surname}</p>
      <p><strong>Source:</strong> ${shipment.source}</p>
      <p><strong>Destination:</strong> ${shipment.destination}</p>
      <p><strong>Current status:</strong> ${shipment.currentStatus}</p>
      <p><strong>Progress:</strong></p>
      <ul>${history}</ul>
    </div>
  `;
};

const ensureAdminUI = () => {
  const loginSection = document.getElementById('adminLogin');
  const dashboardSection = document.getElementById('dashboardSection');
  const activeSection = document.getElementById('activeSection');

  if (isAdminAuthenticated()) {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    activeSection.style.display = 'block';
    loadAdminDashboard();
  } else {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    activeSection.style.display = 'none';
  }
};

const loadAdminDashboard = async () => {
  const pendingContainer = document.getElementById('pendingRequests');
  const activeContainer = document.getElementById('activeShipments');

  if (!pendingContainer || !activeContainer) return;

  const response = await fetch('/api/admin/requests', { headers: getAdminHeaders() });
  if (!response.ok) {
    alert('Admin access denied. Please sign in with the correct admin email.');
    clearAdminAuthentication();
    ensureAdminUI();
    return;
  }

  const data = await response.json();

  const pendingRequests = data.requests.filter(request => request.status === 'pending');
  const activeShipments = data.requests.filter(request => request.status === 'active');

  pendingContainer.innerHTML = pendingRequests.length
    ? pendingRequests.map(request => `
        <div class="card-item">
          <p><strong>${request.name} ${request.surname}</strong></p>
          <p>${request.email} • ${request.phone}</p>
          <p>From ${request.source} to ${request.destination}</p>
          <p>${request.packageDetails}</p>
          <button class="action-button" onclick="issueCode('${request.id}')">Issue tracking code</button>
        </div>
      `).join('')
    : '<p>No pending requests at the moment.</p>';

  activeContainer.innerHTML = activeShipments.length
    ? activeShipments.map(request => `
        <div class="card-item">
          <p><strong>${request.name} ${request.surname}</strong></p>
          <p>${request.email} • ${request.phone}</p>
          <p>Code: <strong>${request.code}</strong></p>
          <p>${request.source} → ${request.destination}</p>
          <p>${createStatusBadge(request.currentStatus)}</p>
        </div>
      `).join('')
    : '<p>No active shipments yet.</p>';
};

const issueCode = async (requestId) => {
  const response = await fetch('/api/admin/issue-code', {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify({ requestId }),
  });

  const result = await response.json();
  if (!response.ok) {
    alert(result.message || 'Unable to issue code.');
    return;
  }

  alert(`Tracking code issued: ${result.code}`);
  loadAdminDashboard();
};

if (document.getElementById('requestForm')) {
  document.getElementById('requestForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    const response = await fetch('/api/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    if (response.ok) {
      showMessage('#requestMessage', `Request received. Share this request ID with the admin: ${result.requestId}`);
      form.reset();
    } else {
      showMessage('#requestMessage', result.message || 'Could not submit the request.');
    }
  });
}

if (document.getElementById('trackForm')) {
  document.getElementById('trackForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    const response = await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    if (response.ok) {
      showMessage('#trackMessage', 'Shipment found.');
      document.getElementById('trackResult').innerHTML = renderTrackResult(result.shipment);
    } else {
      showMessage('#trackMessage', result.message || 'Unable to find the shipment.');
      document.getElementById('trackResult').innerHTML = '';
    }
  });
}

if (document.body.classList.contains('admin-page')) {
  const loginForm = document.getElementById('adminLoginForm');
  const logoutButton = document.getElementById('adminLogout');

  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      const email = formData.get('adminEmail');

      if (email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setAdminAuthenticated();
        ensureAdminUI();
      } else {
        showMessage('#adminLoginMessage', 'Incorrect admin email.');
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      clearAdminAuthentication();
      ensureAdminUI();
    });
  }

  ensureAdminUI();
}
