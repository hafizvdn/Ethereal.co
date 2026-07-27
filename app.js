/* Ethereal.co — shared front-end behaviour.
   Static demo: nothing is sent to a server. The cart lives in localStorage,
   and product details are read out of the shop markup, so the HTML stays the
   single source of truth for what is on sale. */
(function () {
  'use strict';

  var STORAGE_KEY = 'ethereal.cart';

  /* =========================================================
     Cart state — { "1.jpg": { name, price, image, qty } }
     ========================================================= */

  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function writeCart(cart) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      /* Storage is unavailable in some private modes — the cart simply
         won't survive a reload. Everything else keeps working. */
    }
    renderCartCount();
  }

  function clearCart() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      /* see writeCart */
    }
    renderCartCount();
  }

  function cartLines() {
    var cart = readCart();
    return Object.keys(cart).map(function (id) {
      var line = cart[id];
      line.id = id;
      return line;
    });
  }

  function cartCount() {
    return cartLines().reduce(function (total, line) {
      return total + line.qty;
    }, 0);
  }

  function cartTotal() {
    return cartLines().reduce(function (total, line) {
      return total + line.price * line.qty;
    }, 0);
  }

  function setQuantity(id, quantity) {
    var cart = readCart();
    if (!cart[id]) return;

    if (quantity <= 0) {
      delete cart[id];
    } else {
      cart[id].qty = quantity;
    }
    writeCart(cart);
  }

  function money(amount) {
    return 'RM ' + amount.toFixed(2);
  }

  /* =========================================================
     Cart count in the nav (every page)
     ========================================================= */

  function renderCartCount() {
    var count = cartCount();
    document.querySelectorAll('[data-cart-count]').forEach(function (element) {
      element.textContent = count ? ' (' + count + ')' : '';
    });
  }

  renderCartCount();

  /* =========================================================
     Shop — add to cart
     ========================================================= */

  document.querySelectorAll('[data-add-to-cart]').forEach(function (button) {
    button.addEventListener('click', function () {
      var product = button.closest('[data-product]');
      if (!product) return;

      var id = product.dataset.product;
      var cart = readCart();

      if (cart[id]) {
        cart[id].qty += 1;
      } else {
        cart[id] = {
          name: product.querySelector('.product-name').textContent.trim(),
          price: Number(product.querySelector('.product-price').value),
          image: product.querySelector('img').getAttribute('src'),
          qty: 1
        };
      }

      writeCart(cart);

      /* Confirm the click without moving the user off the page */
      window.clearTimeout(button.resetLabel);
      button.textContent = 'Added';
      button.resetLabel = window.setTimeout(function () {
        button.textContent = 'Add to cart';
      }, 1200);
    });
  });

  /* =========================================================
     Cart page
     ========================================================= */

  var cartList = document.getElementById('cart-list');

  function quantityButton(label, description, onClick) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-label', description);
    button.addEventListener('click', onClick);
    return button;
  }

  function cartRow(line) {
    var row = document.createElement('li');
    row.className = 'cart-row';

    var media = document.createElement('div');
    media.className = 'cart-row-media';
    var image = document.createElement('img');
    image.src = line.image;
    image.alt = line.name;
    media.appendChild(image);

    var name = document.createElement('h2');
    name.className = 'cart-row-name';
    name.textContent = line.name;

    var lineTotal = document.createElement('span');
    lineTotal.className = 'cart-row-total';
    lineTotal.textContent = money(line.price * line.qty);

    var head = document.createElement('div');
    head.className = 'cart-row-head';
    head.appendChild(name);
    head.appendChild(lineTotal);

    var unitPrice = document.createElement('p');
    unitPrice.className = 'cart-row-price';
    unitPrice.textContent = money(line.price) + ' each';

    var quantity = document.createElement('div');
    quantity.className = 'qty';
    quantity.appendChild(quantityButton('−', 'Decrease quantity of ' + line.name, function () {
      setQuantity(line.id, line.qty - 1);
      renderCartPage();
    }));

    var value = document.createElement('span');
    value.className = 'qty-value';
    value.textContent = line.qty;
    quantity.appendChild(value);

    quantity.appendChild(quantityButton('+', 'Increase quantity of ' + line.name, function () {
      setQuantity(line.id, line.qty + 1);
      renderCartPage();
    }));

    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'cart-remove';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', 'Remove ' + line.name + ' from your cart');
    remove.addEventListener('click', function () {
      setQuantity(line.id, 0);
      renderCartPage();
    });

    var actions = document.createElement('div');
    actions.className = 'cart-row-actions';
    actions.appendChild(quantity);
    actions.appendChild(remove);

    var body = document.createElement('div');
    body.className = 'cart-row-body';
    body.appendChild(head);
    body.appendChild(unitPrice);
    body.appendChild(actions);

    row.appendChild(media);
    row.appendChild(body);
    return row;
  }

  function renderCartPage() {
    var lines = cartLines();
    var empty = document.getElementById('cart-empty');
    var summary = document.getElementById('cart-summary');

    cartList.textContent = '';

    if (!lines.length) {
      cartList.hidden = true;
      summary.hidden = true;
      empty.hidden = false;
      return;
    }

    cartList.hidden = false;
    summary.hidden = false;
    empty.hidden = true;

    lines.forEach(function (line) {
      cartList.appendChild(cartRow(line));
    });

    document.getElementById('cart-total').textContent = money(cartTotal());
  }

  if (cartList) renderCartPage();

  /* =========================================================
     Checkout — order summary
     ========================================================= */

  var orderLines = document.getElementById('order-lines');

  if (orderLines) {
    var orderEmpty = document.getElementById('order-empty');
    var orderTotalRow = document.getElementById('order-total-row');
    var confirmButton = document.querySelector('[data-confirm-order]');
    var checkoutLines = cartLines();

    if (!checkoutLines.length) {
      orderEmpty.hidden = false;
      orderTotalRow.hidden = true;
      if (confirmButton) confirmButton.disabled = true;
    } else {
      orderEmpty.hidden = true;
      orderTotalRow.hidden = false;

      checkoutLines.forEach(function (line) {
        var item = document.createElement('li');
        item.className = 'order-line';

        var label = document.createElement('span');
        label.textContent = line.qty > 1 ? line.name + ' × ' + line.qty : line.name;

        var amount = document.createElement('span');
        amount.textContent = money(line.price * line.qty);

        item.appendChild(label);
        item.appendChild(amount);
        orderLines.appendChild(item);
      });

      document.getElementById('order-total').textContent = money(cartTotal());
    }
  }

  /* =========================================================
     Password visibility toggles
     ========================================================= */

  document.querySelectorAll('.password-toggle').forEach(function (toggle) {
    var input = document.getElementById(toggle.dataset.target);
    if (!input) return;

    toggle.addEventListener('click', function () {
      var reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      toggle.textContent = reveal ? 'Hide' : 'Show';
      toggle.setAttribute('aria-pressed', String(reveal));
      toggle.setAttribute('aria-label', (reveal ? 'Hide' : 'Show') + ' password');
    });
  });

  /* =========================================================
     Inline validation
     Forms navigate via JS rather than submitting, so passwords and
     addresses never end up in the URL or browser history.
     ========================================================= */

  document.querySelectorAll('form[data-next]').forEach(function (form) {
    form.setAttribute('novalidate', '');

    function validate(control) {
      var field = control.closest('.field');
      if (!field) return true;

      var valid = control.checkValidity();
      field.classList.toggle('invalid', !valid);
      control.setAttribute('aria-invalid', valid ? 'false' : 'true');
      return valid;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var firstInvalid = null;
      form.querySelectorAll('input, select').forEach(function (control) {
        if (!validate(control) && !firstInvalid) firstInvalid = control;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      if (form.hasAttribute('data-clear-cart')) clearCart();
      window.location.href = form.dataset.next;
    });

    /* Clear an error as soon as the user corrects it */
    form.addEventListener('input', function (event) {
      var field = event.target.closest('.field');
      if (field && field.classList.contains('invalid')) validate(event.target);
    });
  });
})();
