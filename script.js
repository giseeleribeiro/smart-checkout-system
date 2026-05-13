const STORAGE_KEYS = {
  cart: 'smartCheckoutCart',
  shipping: 'smartCheckoutShipping',
  payment: 'smartCheckoutPayment',
  order: 'smartCheckoutOrder',
  promo: 'smartCheckoutPromo'
};

const PRODUCTS = [
  {
    id: 1,
    name: 'Air Purifier',
    price: 89,
    category: 'Home',
    image: 'images/airpurifier.jpg',
    description: 'Compact air purifier for cleaner indoor air and quiet everyday use.'
  },
  {
    id: 2,
    name: 'Power Bank',
    price: 59,
    category: 'Portable',
    image: 'images/powerbank.jpg',
    description: 'Fast portable charging solution for phones, earbuds and daily travel.'
  },
  {
    id: 3,
    name: 'Robot Vacuum',
    price: 129,
    category: 'Smart Home',
    image: 'images/robotvaccum.jpg',
    description: 'Automatic cleaning support for busy routines with simple controls.'
  },
  {
    id: 4,
    name: 'Headphones',
    price: 39,
    category: 'Audio',
    image: 'images/headphones.jpg',
    description: 'Comfortable wired headphones for study, music and focused work sessions.'
  }
];

const SHIPPING_PRICES = {
  standard: 10,
  express: 20,
  pickup: 0
};

const SHIPPING_LABELS = {
  standard: 'Standard delivery (3–5 business days)',
  express: 'Express delivery (1–2 business days)',
  pickup: 'Store pickup (ready within 24 hours)'
};

function getStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function setStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getProductById(productId) {
  return PRODUCTS.find((product) => product.id === Number(productId));
}

function getCart() {
  const cart = getStored(STORAGE_KEYS.cart, []);
  if (!Array.isArray(cart)) return [];

  return cart
    .map((item) => {
      const product = getProductById(item.id);
      if (!product) return null;
      return {
        ...product,
        quantity: Math.max(1, Number(item.quantity) || 1)
      };
    })
    .filter(Boolean);
}

function saveCart(cart) {
  const cleanedCart = cart
    .filter((item) => item && item.quantity > 0)
    .map((item) => ({ id: item.id, quantity: item.quantity }));

  setStored(STORAGE_KEYS.cart, cleanedCart);
  updateCartCount();
  renderSummary();
}

function updateCartCount() {
  const countNodes = document.querySelectorAll('[data-cart-count]');
  if (!countNodes.length) return;

  const totalItems = getCart().reduce((sum, item) => sum + item.quantity, 0);
  countNodes.forEach((node) => {
    node.textContent = totalItems;
  });
}

function getDefaultShippingData() {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Australia',
    method: 'standard'
  };
}

function getDefaultPaymentData() {
  return {
    paymentMethod: 'card',
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    sameBilling: true,
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingPostcode: ''
  };
}

function getShippingData() {
  return { ...getDefaultShippingData(), ...getStored(STORAGE_KEYS.shipping, {}) };
}

function getPaymentData() {
  return { ...getDefaultPaymentData(), ...getStored(STORAGE_KEYS.payment, {}) };
}

function getPromoCode() {
  return getStored(STORAGE_KEYS.promo, '');
}

function getPromoDiscount(subtotal) {
  return getPromoCode() === 'SAVE10' ? Math.min(10, subtotal) : 0;
}

function calculateSummary() {
  const cart = getCart();
  const shipping = getShippingData();
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = SHIPPING_PRICES[shipping.method] ?? SHIPPING_PRICES.standard;
  const discount = getPromoDiscount(subtotal);
  const total = Math.max(0, subtotal + shippingCost - discount);

  return { cart, subtotal, shippingCost, discount, total };
}

function renderProductImage(product, className = 'product-img') {
  return `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="${escapeHtml(className)}">`;
}

function showMiniMessage(text, isError = false) {
  const message = document.querySelector('[data-feedback]');
  if (!message) return;
  message.textContent = text;
  message.style.color = isError ? 'var(--danger)' : 'var(--success)';

  clearTimeout(showMiniMessage.timer);
  showMiniMessage.timer = setTimeout(() => {
    message.textContent = '';
  }, 2200);
}

function addToCart(productId) {
  const product = getProductById(productId);
  if (!product) return;

  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart(cart);
  showMiniMessage(`${product.name} added to cart.`);
}

function updateQuantity(productId, change) {
  const cart = getCart().map((item) => {
    if (item.id !== productId) return item;
    return { ...item, quantity: Math.max(1, item.quantity + change) };
  });

  saveCart(cart);
  renderCartPage();
}

function removeItem(productId) {
  const product = getProductById(productId);
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
  renderCartPage();
  if (product) showMiniMessage(`${product.name} removed from cart.`);
}

function renderMiniProducts(targetSelector) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  target.innerHTML = PRODUCTS.map((product) => `
    <article class="card product-card">
      ${renderProductImage(product)}
      <div class="badge">${escapeHtml(product.category)}</div>
      <h3>${escapeHtml(product.name)}</h3>
      <p>${escapeHtml(product.description)}</p>
      <div class="product-meta">
        <span class="price">${formatCurrency(product.price)}</span>
        <span>${escapeHtml(product.category)}</span>
      </div>
      <button class="btn full-width" data-add-cart="${product.id}">Add to cart</button>
    </article>
  `).join('');

  target.querySelectorAll('[data-add-cart]').forEach((button) => {
    button.addEventListener('click', () => addToCart(Number(button.dataset.addCart)));
  });
}

function renderCartPage() {
  const list = document.querySelector('[data-cart-items]');
  if (!list) return;

  const cart = getCart();

  if (!cart.length) {
    list.innerHTML = `
      <div class="card empty-state">
        <h3>Your cart is empty</h3>
        <p>Add products from the homepage to test the full checkout flow.</p>
        <a href="index.html" class="btn">Back to homepage</a>
      </div>
    `;
    renderSummary();
    return;
  }

  list.innerHTML = `
    <div class="card panel">
      ${cart.map((item) => `
        <div class="cart-item">
          <div class="item-thumb">${renderProductImage(item)}</div>
          <div class="item-meta">
            <h4>${escapeHtml(item.name)}</h4>
            <p>${escapeHtml(item.description)}</p>
            <div class="item-actions">
              <div class="qty-control">
                <button type="button" data-qty-change="-1" data-product-id="${item.id}">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-qty-change="1" data-product-id="${item.id}">+</button>
              </div>
              <button type="button" class="btn-link remove-btn" data-remove-item="${item.id}">Remove</button>
            </div>
          </div>
          <div class="item-total">${formatCurrency(item.price * item.quantity)}</div>
        </div>
      `).join('')}
    </div>
  `;

  list.querySelectorAll('[data-qty-change]').forEach((button) => {
    button.addEventListener('click', () => {
      updateQuantity(Number(button.dataset.productId), Number(button.dataset.qtyChange));
    });
  });

  list.querySelectorAll('[data-remove-item]').forEach((button) => {
    button.addEventListener('click', () => removeItem(Number(button.dataset.removeItem)));
  });

  renderSummary();
}

function renderSummary() {
  const summaryContainers = document.querySelectorAll('[data-summary-items]');
  const subtotalNodes = document.querySelectorAll('[data-subtotal]');
  const shippingNodes = document.querySelectorAll('[data-shipping]');
  const discountNodes = document.querySelectorAll('[data-discount]');
  const totalNodes = document.querySelectorAll('[data-total]');
  const discountRows = document.querySelectorAll('[data-discount-row]');

  if (!summaryContainers.length && !subtotalNodes.length && !shippingNodes.length && !discountNodes.length && !totalNodes.length) {
    return;
  }

  const shipping = getShippingData();
  const { cart, subtotal, shippingCost, discount, total } = calculateSummary();

  const summaryItemsMarkup = cart.length
    ? cart.map((item) => `
        <div class="summary-item">
          <div class="item-thumb">${renderProductImage(item)}</div>
          <div class="item-meta">
            <h4>${escapeHtml(item.name)}</h4>
            <p>Qty: ${item.quantity}</p>
          </div>
          <div class="item-total">${formatCurrency(item.price * item.quantity)}</div>
        </div>
      `).join('')
    : '<p class="panel-subtitle">No items added yet.</p>';

  summaryContainers.forEach((container) => {
    container.innerHTML = summaryItemsMarkup;
  });
  subtotalNodes.forEach((node) => { node.textContent = formatCurrency(subtotal); });
  shippingNodes.forEach((node) => {
    node.textContent = `${formatCurrency(shippingCost)}${shipping.method === 'pickup' ? ' · Pickup' : ''}`;
  });
  discountNodes.forEach((node) => { node.textContent = `− ${formatCurrency(discount)}`; });
  totalNodes.forEach((node) => { node.textContent = formatCurrency(total); });
  discountRows.forEach((row) => row.classList.toggle('hidden', discount <= 0));
}

function initialisePromo() {
  const applyButton = document.querySelector('[data-apply-promo]');
  const input = document.querySelector('[data-promo-input]');
  const message = document.querySelector('[data-promo-message]');
  if (!applyButton || !input || !message) return;

  input.value = getPromoCode();
  if (getPromoCode() === 'SAVE10') {
    message.textContent = 'Promo code applied successfully.';
  }

  applyButton.addEventListener('click', () => {
    const value = input.value.trim().toUpperCase();
    if (value === 'SAVE10') {
      setStored(STORAGE_KEYS.promo, value);
      message.textContent = 'Promo code applied successfully.';
      renderSummary();
      return;
    }

    setStored(STORAGE_KEYS.promo, '');
    message.textContent = 'Invalid promo code. Try SAVE10.';
    renderSummary();
  });
}

function serialiseForm(form) {
  const data = {};

  Array.from(form.elements).forEach((field) => {
    if (!field.name || field.disabled) return;

    if (field.type === 'radio') {
      if (field.checked) data[field.name] = field.value;
      return;
    }

    if (field.type === 'checkbox') {
      data[field.name] = field.checked;
      return;
    }

    data[field.name] = field.value.trim();
  });

  return data;
}

function fillForm(form, data) {
  Array.from(form.elements).forEach((field) => {
    if (!field.name || !(field.name in data)) return;

    if (field.type === 'radio') {
      field.checked = field.value === String(data[field.name]);
      return;
    }

    if (field.type === 'checkbox') {
      field.checked = Boolean(data[field.name]);
      return;
    }

    field.value = data[field.name] ?? '';
  });
}

function setError(selector, message) {
  const target = document.querySelector(selector);
  if (!target) return;
  target.textContent = message || '';
}

function toggleActiveOptions(groupName) {
  document.querySelectorAll(`[data-option-group="${groupName}"]`).forEach((option) => {
    const input = option.querySelector(`input[name="${groupName}"]`);
    option.classList.toggle('active', Boolean(input && input.checked));
  });
}

function validateShipping(data) {
  const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'postcode', 'country'];
  const hasMissing = requiredFields.some((field) => !data[field]);
  if (hasMissing) return 'Please complete all shipping fields before continuing.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Please enter a valid email address.';
  return '';
}

function validatePayment(data) {
  if (data.paymentMethod === 'paypal') return '';

  const requiredFields = ['cardName', 'cardNumber', 'expiry', 'cvv'];
  const hasMissing = requiredFields.some((field) => !data[field]);
  if (hasMissing) return 'Please complete the card details before continuing.';

  if (data.cardNumber.replace(/\s/g, '').length !== 16) return 'Card number must contain 16 digits.';
  if (!/^\d{2}\/\d{2}$/.test(data.expiry)) return 'Expiry date must be in MM/YY format.';
  if (!/^\d{3}$/.test(data.cvv)) return 'CVV must contain 3 digits.';

  if (!data.sameBilling) {
    const billingRequired = ['billingAddress', 'billingCity', 'billingState', 'billingPostcode'];
    const missingBilling = billingRequired.some((field) => !data[field]);
    if (missingBilling) return 'Please complete the billing address or select same as shipping.';
  }

  return '';
}

function hasValidShipping() {
  return !validateShipping(getShippingData());
}

function hasValidPayment() {
  return !validatePayment(getPaymentData());
}

function initCheckoutStepSwitcher() {
  if (document.body.dataset.page !== 'checkout') return;

  const params = new URLSearchParams(window.location.search);
  let step = params.get('step') === 'payment' ? 'payment' : 'shipping';

  if (step === 'payment' && !getCart().length) {
    window.location.href = 'cart.html';
    return;
  }

  const shippingSection = document.querySelector('[data-step="shipping"]');
  const paymentSection = document.querySelector('[data-step="payment"]');
  const stepShipping = document.querySelector('[data-step-indicator="shipping"]');
  const stepPayment = document.querySelector('[data-step-indicator="payment"]');
  const stepReview = document.querySelector('[data-step-indicator="review"]');

  if (shippingSection && paymentSection) {
    shippingSection.classList.toggle('hidden', step !== 'shipping');
    paymentSection.classList.toggle('hidden', step !== 'payment');
  }

  if (stepShipping) stepShipping.className = `step ${step === 'shipping' ? 'active' : 'done'}`;
  if (stepPayment) stepPayment.className = `step ${step === 'payment' ? 'active' : ''}`;
  if (stepReview) stepReview.className = 'step';
}

function initCheckoutForms() {
  const shippingForm = document.querySelector('[data-shipping-form]');
  const paymentForm = document.querySelector('[data-payment-form]');

  if (shippingForm) {
    fillForm(shippingForm, getShippingData());

    shippingForm.querySelectorAll('input, select').forEach((field) => {
      field.addEventListener('input', () => {
        const data = { ...getShippingData(), ...serialiseForm(shippingForm) };
        setStored(STORAGE_KEYS.shipping, data);
        renderSummary();
      });
      field.addEventListener('change', () => {
        const data = { ...getShippingData(), ...serialiseForm(shippingForm) };
        setStored(STORAGE_KEYS.shipping, data);
        renderSummary();
      });
    });

    shippingForm.querySelectorAll('input[name="method"]').forEach((input) => {
      input.addEventListener('change', () => {
        toggleActiveOptions('method');
      });
    });
    toggleActiveOptions('method');

    const shippingButton = document.querySelector('[data-save-shipping]');
    if (shippingButton) {
      shippingButton.addEventListener('click', () => {
        const cart = getCart();
        if (!cart.length) {
          setError('[data-shipping-error]', 'Please add at least one product to the cart first.');
          return;
        }

        const data = { ...getDefaultShippingData(), ...serialiseForm(shippingForm) };
        const error = validateShipping(data);
        setError('[data-shipping-error]', error);
        if (error) return;

        setStored(STORAGE_KEYS.shipping, data);
        window.location.href = 'checkout.html?step=payment';
      });
    }
  }

  if (paymentForm) {
    fillForm(paymentForm, getPaymentData());

    const sameBilling = paymentForm.querySelector('[name="sameBilling"]');
    const billingFields = document.querySelector('[data-billing-fields]');
    const cardNumberField = paymentForm.querySelector('[name="cardNumber"]');
    const expiryField = paymentForm.querySelector('[name="expiry"]');
    const cvvField = paymentForm.querySelector('[name="cvv"]');

    paymentForm.querySelectorAll('input, select').forEach((field) => {
      field.addEventListener('input', () => {
        const data = { ...getPaymentData(), ...serialiseForm(paymentForm) };
        setStored(STORAGE_KEYS.payment, data);
      });
      field.addEventListener('change', () => {
        const data = { ...getPaymentData(), ...serialiseForm(paymentForm) };
        setStored(STORAGE_KEYS.payment, data);
      });
    });

    paymentForm.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
      input.addEventListener('change', () => {
        toggleActiveOptions('paymentMethod');
      });
    });
    toggleActiveOptions('paymentMethod');

    if (sameBilling && billingFields) {
      const updateBillingVisibility = () => {
        billingFields.classList.toggle('hidden', sameBilling.checked);
      };
      sameBilling.addEventListener('change', updateBillingVisibility);
      updateBillingVisibility();
    }

    if (cardNumberField) {
      cardNumberField.addEventListener('input', () => {
        cardNumberField.value = cardNumberField.value
          .replace(/\D/g, '')
          .slice(0, 16)
          .replace(/(\d{4})(?=\d)/g, '$1 ')
          .trim();
      });
    }

    if (expiryField) {
      expiryField.addEventListener('input', () => {
        const cleaned = expiryField.value.replace(/\D/g, '').slice(0, 4);
        expiryField.value = cleaned.length > 2 ? `${cleaned.slice(0, 2)}/${cleaned.slice(2)}` : cleaned;
      });
    }

    if (cvvField) {
      cvvField.addEventListener('input', () => {
        cvvField.value = cvvField.value.replace(/\D/g, '').slice(0, 3);
      });
    }

    const paymentButton = document.querySelector('[data-save-payment]');
    if (paymentButton) {
      paymentButton.addEventListener('click', () => {
        if (!hasValidShipping()) {
          setError('[data-payment-error]', 'Please complete the shipping step first.');
          window.location.href = 'checkout.html?step=shipping';
          return;
        }

        const data = { ...getDefaultPaymentData(), ...serialiseForm(paymentForm) };
        const error = validatePayment(data);
        setError('[data-payment-error]', error);
        if (error) return;

        setStored(STORAGE_KEYS.payment, data);
        window.location.href = 'review.html';
      });
    }
  }

  renderSummary();
}

function getMaskedCard(cardNumber) {
  const digits = String(cardNumber || '').replace(/\D/g, '');
  return digits ? `**** **** **** ${digits.slice(-4)}` : 'Not provided';
}

function renderReviewPage() {
  const reviewTarget = document.querySelector('[data-review-content]');
  if (!reviewTarget) return;

  const cart = getCart();
  if (!cart.length) {
    reviewTarget.innerHTML = `
      <div class="card empty-state">
        <h3>Your cart is empty</h3>
        <p>Please add products before reviewing the order.</p>
        <a href="index.html" class="btn">Go to homepage</a>
      </div>
    `;
    renderSummary();
    return;
  }

  const shipping = getShippingData();
  const payment = getPaymentData();

  if (!hasValidShipping()) {
    reviewTarget.innerHTML = `
      <div class="card empty-state">
        <h3>Shipping details are missing</h3>
        <p>Please complete the shipping step before reviewing the order.</p>
        <a href="checkout.html?step=shipping" class="btn">Go to shipping</a>
      </div>
    `;
    renderSummary();
    return;
  }

  if (!hasValidPayment()) {
    reviewTarget.innerHTML = `
      <div class="card empty-state">
        <h3>Payment details are missing</h3>
        <p>Please complete the payment step before reviewing the order.</p>
        <a href="checkout.html?step=payment" class="btn">Go to payment</a>
      </div>
    `;
    renderSummary();
    return;
  }

  const billingText = payment.sameBilling
    ? 'Same as shipping address'
    : `${escapeHtml(payment.billingAddress)}, ${escapeHtml(payment.billingCity)}, ${escapeHtml(payment.billingState)} ${escapeHtml(payment.billingPostcode)}`;

  reviewTarget.innerHTML = `
    <div class="card panel review-section">
      <div class="review-card-header">
        <h3>Shipping information</h3>
        <a href="checkout.html?step=shipping" class="btn-link">Edit</a>
      </div>
      <p class="review-label">Contact</p>
      <div class="review-block">
        <div class="review-row"><span>Name</span><span>${escapeHtml(shipping.firstName)} ${escapeHtml(shipping.lastName)}</span></div>
        <div class="review-row"><span>Email</span><span>${escapeHtml(shipping.email)}</span></div>
        <div class="review-row"><span>Phone</span><span>${escapeHtml(shipping.phone)}</span></div>
      </div>
      <p class="review-label">Address</p>
      <div class="review-block">
        <div class="review-row"><span>Street</span><span>${escapeHtml(shipping.address)}</span></div>
        <div class="review-row"><span>City</span><span>${escapeHtml(shipping.city)}</span></div>
        <div class="review-row"><span>State</span><span>${escapeHtml(shipping.state)}</span></div>
        <div class="review-row"><span>Postcode</span><span>${escapeHtml(shipping.postcode)}</span></div>
        <div class="review-row"><span>Country</span><span>${escapeHtml(shipping.country)}</span></div>
        <div class="review-row"><span>Delivery</span><span>${escapeHtml(SHIPPING_LABELS[shipping.method] || SHIPPING_LABELS.standard)}</span></div>
      </div>
    </div>

    <div class="card panel review-section">
      <div class="review-card-header">
        <h3>Payment information</h3>
        <a href="checkout.html?step=payment" class="btn-link">Edit</a>
      </div>
      <p class="review-label">Method</p>
      <div class="review-block">
        <div class="review-row"><span>Payment type</span><span>${payment.paymentMethod === 'paypal' ? 'PayPal' : 'Credit or debit card'}</span></div>
        <div class="review-row"><span>Name on card</span><span>${escapeHtml(payment.cardName || 'Not provided')}</span></div>
        <div class="review-row"><span>Card</span><span>${payment.paymentMethod === 'paypal' ? 'PayPal account' : escapeHtml(getMaskedCard(payment.cardNumber))}</span></div>
        <div class="review-row"><span>Billing address</span><span>${billingText}</span></div>
      </div>
    </div>
  `;

  renderSummary();

  const placeOrderButton = document.querySelector('[data-place-order]');
  if (placeOrderButton) {
    placeOrderButton.addEventListener('click', () => {
      const { cart: summaryCart, subtotal, shippingCost, discount, total } = calculateSummary();

      const order = {
        orderNumber: `OS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        placedAt: new Date().toLocaleString(),
        cart: summaryCart,
        subtotal,
        shippingCost,
        discount,
        total,
        shipping: getShippingData(),
        payment: getPaymentData()
      };

      setStored(STORAGE_KEYS.order, order);
      setStored(STORAGE_KEYS.cart, []);
      updateCartCount();
      window.location.href = 'confirmation.html';
    });
  }
}

function renderConfirmationPage() {
  const target = document.querySelector('[data-confirmation]');
  if (!target) return;

  const order = getStored(STORAGE_KEYS.order, null);
  if (!order) {
    target.innerHTML = `
      <div class="card panel empty-state">
        <h2>No recent order found</h2>
        <p>Go through the checkout flow first so the confirmation page can show the order details.</p>
        <a href="index.html" class="btn">Start checkout</a>
      </div>
    `;
    return;
  }

  target.innerHTML = `
    <section class="card confirmation-hero">
      <div class="success-icon">✓</div>
      <h1 class="page-title">Order placed successfully</h1>
      <p class="page-subtitle">Thank you for shopping with OneStop. Your order has been confirmed and the summary is below.</p>
      <div class="order-chip">${escapeHtml(order.orderNumber)}</div>
    </section>

    <section class="confirmation-grid">
      <div class="card panel">
        <h3>Order summary</h3>
        <div>
          ${(order.cart || []).map((item) => `
            <div class="summary-item">
              <div class="item-thumb">${renderProductImage(item)}</div>
              <div class="item-meta">
                <h4>${escapeHtml(item.name)}</h4>
                <p>Qty: ${item.quantity}</p>
              </div>
              <div class="item-total">${formatCurrency(item.price * item.quantity)}</div>
            </div>
          `).join('')}
        </div>
        <div class="summary-totals">
          <div class="summary-line"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
          <div class="summary-line"><span>Shipping</span><span>${formatCurrency(order.shippingCost)}</span></div>
          <div class="summary-line ${order.discount > 0 ? '' : 'hidden'}"><span>Discount</span><span>− ${formatCurrency(order.discount)}</span></div>
          <div class="summary-line total"><span>Total</span><span>${formatCurrency(order.total)}</span></div>
        </div>
      </div>

      <div class="card panel">
        <h3>Delivery details</h3>
        <div class="review-block">
          <div class="review-row"><span>Name</span><span>${escapeHtml(order.shipping.firstName)} ${escapeHtml(order.shipping.lastName)}</span></div>
          <div class="review-row"><span>Email</span><span>${escapeHtml(order.shipping.email)}</span></div>
          <div class="review-row"><span>Address</span><span>${escapeHtml(order.shipping.address)}, ${escapeHtml(order.shipping.city)} ${escapeHtml(order.shipping.state)} ${escapeHtml(order.shipping.postcode)}</span></div>
          <div class="review-row"><span>Method</span><span>${escapeHtml(SHIPPING_LABELS[order.shipping.method] || SHIPPING_LABELS.standard)}</span></div>
          <div class="review-row"><span>Placed at</span><span>${escapeHtml(order.placedAt)}</span></div>
        </div>
        <div style="margin-top:18px; display:flex; gap:12px; flex-wrap:wrap;">
          <a href="index.html" class="btn">Continue shopping</a>
          <a href="cart.html" class="btn-ghost">Open cart</a>
        </div>
      </div>
    </section>
  `;
}

function init() {
  updateCartCount();
  renderMiniProducts('[data-product-grid]');
  renderCartPage();
  initialisePromo();
  initCheckoutStepSwitcher();
  initCheckoutForms();
  renderReviewPage();
  renderConfirmationPage();
  renderSummary();
}

document.addEventListener('DOMContentLoaded', init);
