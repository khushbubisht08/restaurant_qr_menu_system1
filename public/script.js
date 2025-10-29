// script.js (customer)
let MENU = [];
const cart = new Map();

const menuRoot = document.getElementById('menu');
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartModal = document.getElementById('cartModal');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const closeCart = document.getElementById('closeCart');
const clearCartBtn = document.getElementById('clearCart');
const placeOrderBtn = document.getElementById('placeOrder');
const tableBadge = document.getElementById('tableBadge');

function formatINR(n){ return n.toFixed(2); }

// read ?table= from url
function getTableFromURL(){
  const params = new URLSearchParams(location.search);
  return params.get('table') || 'unknown';
}

const TABLE = getTableFromURL();
tableBadge.textContent = TABLE !== 'unknown' ? `Table: ${TABLE}` : 'Table not specified';

// load menu.json
async function loadMenu(){
  try {
    const res = await fetch('menu.json');
    MENU = await res.json();
    renderMenu();
  } catch (e) {
    menuRoot.innerHTML = '<p>Failed to load menu</p>';
  }
}

function renderMenu(){
  menuRoot.innerHTML = '';
  MENU.forEach(section=>{
    const title = document.createElement('h3');
    title.className = 'category-title';
    title.textContent = section.category;
    menuRoot.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'menu-grid';

    section.items.forEach(it=>{
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <img src="${it.img}" alt="${it.name}" loading="lazy">
        <h4>${it.name}</h4>
        <p style="margin:0;color:var(--muted)">${it.desc}</p>
        <div class="price-row">
          <div>₹ ${formatINR(it.price)}</div>
          <button class="add-btn" data-id="${it.id}">Add</button>
        </div>
      `;
      grid.appendChild(card);
    });

    menuRoot.appendChild(grid);
  });

  // attach add buttons
  document.querySelectorAll('.add-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = Number(btn.dataset.id);
      const item = MENU.flatMap(m=>m.items).find(i=>i.id===id);
      addToCart(item);
    });
  });
}


function addToCart(item){
  const cur = cart.get(item.id) || { item, qty:0 };
  cur.qty += 1;
  cart.set(item.id, cur);
  updateCartUI();
}

function updateCartUI(){
  let totalQty = 0, total = 0;
  cart.forEach(({item, qty}) => {
    totalQty += qty; total += item.price * qty;
  });
  cartCount.textContent = totalQty;
  cartTotalEl.textContent = formatINR(total);

  cartItemsEl.innerHTML = '';
  if (cart.size === 0) {
    cartItemsEl.innerHTML = '<div style="color:var(--muted)">Cart is empty</div>';
    return;
  }
  cart.forEach(({item, qty})=>{
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <div style="flex:1">
        <strong>${item.name}</strong>
        <div style="color:var(--muted);font-size:13px">₹ ${formatINR(item.price)} × ${qty}</div>
      </div>
      <div>
        <button data-id="${item.id}" class="dec">−</button>
        <button data-id="${item.id}" class="inc">+</button>
      </div>
    `;
    cartItemsEl.appendChild(row);
  });

  cartItemsEl.querySelectorAll('.inc').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = Number(e.currentTarget.dataset.id);
      const entry = cart.get(id);
      entry.qty += 1;
      cart.set(id, entry);
      updateCartUI();
    });
  });
  cartItemsEl.querySelectorAll('.dec').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = Number(e.currentTarget.dataset.id);
      const entry = cart.get(id);
      entry.qty -= 1;
      if (entry.qty <= 0) cart.delete(id); else cart.set(id, entry);
      updateCartUI();
    });
  });
}

// UI events
cartBtn.addEventListener('click', ()=> cartModal.classList.remove('hidden'));
closeCart.addEventListener('click', ()=> cartModal.classList.add('hidden'));
clearCartBtn.addEventListener('click', ()=> { cart.clear(); updateCartUI(); });

// Place order -> send to server
placeOrderBtn.addEventListener('click', async ()=>{
  if (cart.size === 0) { alert('Cart is empty'); return; }
  const items = Array.from(cart.values()).map(({item, qty}) => ({ id: item.id, name: item.name, qty, price: item.price }));
  try {
    const res = await fetch('/order', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ table: TABLE, items })
    });
    const data = await res.json();
    if (data && data.success) {
      // Show order tracking
      cart.clear(); 
      updateCartUI(); 
      cartModal.classList.add('hidden');
      
      // Show tracking modal
      const trackModal = document.getElementById('trackModal');
      const trackContent = document.getElementById('trackContent');
      
      const total = items.reduce((sum, i) => sum + (i.price * i.qty), 0);
      
      trackContent.innerHTML = `
        <div class="text-center mb-6">
          <div class="text-4xl mb-2">🎉</div>
          <h3 class="text-2xl font-bold mb-2">Order ID: ${data.orderId}</h3>
          <p class="text-gray-600">Table ${TABLE}</p>
        </div>
        
        <div class="bg-gray-50 rounded-xl p-4 mb-6">
          <h4 class="font-bold mb-3">Order Items:</h4>
          ${items.map(i => `
            <div class="flex justify-between py-2 border-b">
              <span>${i.name} × ${i.qty}</span>
              <span class="font-bold">₹${(i.price * i.qty).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="flex justify-between pt-3 mt-3 border-t-2 font-bold text-lg">
            <span>Total:</span>
            <span class="text-orange-600">₹${total.toFixed(2)}</span>
          </div>
        </div>
        
        <div id="orderStatus" class="text-center p-6 rounded-xl bg-orange-100 text-orange-600">
          <div class="text-4xl mb-2">⏳</div>
          <div class="text-2xl font-bold mb-2">Pending</div>
          <p class="text-sm">Your order is being reviewed...</p>
        </div>
      `;
      
      trackModal.classList.remove('hidden');
      startStatusCheck(data.orderId);
      
    } else {
      alert('Failed to place order');
    }
  } catch (e) {
    console.error(e);
    alert('Network error placing order');
  }
});

// close modal on background click
cartModal.addEventListener('click', e=>{ if (e.target === cartModal) cartModal.classList.add('hidden'); });

loadMenu();
updateCartUI();
