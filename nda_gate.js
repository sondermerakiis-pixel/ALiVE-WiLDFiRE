// ============================================================
// ALiVE-WiLDFiRE — NDA TOKEN GATE — Frontend JavaScript
// ============================================================
//
// INTEGRATION FOR ANTI:
// 1. Add this BEFORE the existing DOMContentLoaded listener in app.js
//    (or include as a separate <script> tag BEFORE app.js)
// 2. The NDA gate blocks the entire dashboard until accepted
// 3. Uses localStorage + server verification for persistence
// ============================================================

const NDA_STORAGE_KEY = 'alive_wildfire_nda_token';

// Check NDA status on page load — show gate if not accepted
function checkNDAStatus() {
  const storedToken = localStorage.getItem(NDA_STORAGE_KEY);

  if (storedToken) {
    // Verify the stored token is still valid on the server
    fetch(`/api/nda/verify/${storedToken}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          hideNDAGate();
        } else {
          // Token was revoked or invalid — clear and show gate
          localStorage.removeItem(NDA_STORAGE_KEY);
          showNDAGate();
        }
      })
      .catch(() => {
        // Network error — if we have a token, allow offline access
        // (graceful degradation for low-bandwidth scenarios)
        if (storedToken) {
          hideNDAGate();
        } else {
          showNDAGate();
        }
      });
  } else {
    showNDAGate();
  }
}

function showNDAGate() {
  const gate = document.getElementById('nda-gate');
  if (gate) {
    gate.classList.remove('hidden');
    gate.style.display = 'flex';
  }
}

function hideNDAGate() {
  const gate = document.getElementById('nda-gate');
  if (gate) {
    gate.classList.add('hidden');
    gate.style.display = 'none';
  }
}

function submitNDA() {
  const fullName = document.getElementById('nda-fullname').value.trim();
  const email = document.getElementById('nda-email').value.trim();
  const org = document.getElementById('nda-org').value.trim();
  const agreed = document.getElementById('nda-checkbox').checked;
  const errorDiv = document.getElementById('nda-error');
  const submitBtn = document.getElementById('nda-submit');

  // Reset error
  errorDiv.style.display = 'none';
  errorDiv.textContent = '';

  // Validation
  if (!fullName) {
    errorDiv.textContent = 'Please enter your full legal name.';
    errorDiv.style.display = 'block';
    return;
  }

  if (!email) {
    errorDiv.textContent = 'Please enter your email address.';
    errorDiv.style.display = 'block';
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errorDiv.textContent = 'Please enter a valid email address.';
    errorDiv.style.display = 'block';
    return;
  }

  if (!agreed) {
    errorDiv.textContent = 'You must agree to the NDA terms to access the platform.';
    errorDiv.style.display = 'block';
    return;
  }

  // Disable button during submission
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Processing...';

  fetch('/api/nda/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName,
      email,
      organization: org,
      agreedToTerms: true
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success && data.token) {
      // Store the NDA token
      localStorage.setItem(NDA_STORAGE_KEY, data.token);

      // Animate out the gate
      const gate = document.getElementById('nda-gate');
      gate.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      gate.style.opacity = '0';
      gate.style.transform = 'scale(1.02)';

      setTimeout(() => {
        hideNDAGate();
        gate.style.opacity = '';
        gate.style.transform = '';
      }, 500);

    } else {
      errorDiv.textContent = data.error || 'Failed to process NDA acceptance.';
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = '🔐 Accept NDA & Enter Platform';
    }
  })
  .catch(err => {
    console.error('NDA submission error:', err);
    errorDiv.textContent = 'Connection error. Please check your network and try again.';
    errorDiv.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = '🔐 Accept NDA & Enter Platform';
  });
}

// ─── Initialize NDA check on page load ───
// Add this to the DOMContentLoaded block in app.js,
// OR wire it up as shown below:
document.addEventListener('DOMContentLoaded', () => {
  checkNDAStatus();

  // Allow Enter key to submit the NDA form
  const ndaForm = document.getElementById('nda-gate');
  if (ndaForm) {
    ndaForm.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitNDA();
      }
    });
  }
});
