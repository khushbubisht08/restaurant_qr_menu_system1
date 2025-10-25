// admin.js
const ordersRoot = document.getElementById('ordersRoot');
const refreshBtn = document.getElementById('refreshBtn');
const clearAllBtn = document.getElementById('clearAll');

async function fetchOrders(){
  try {
    const res = await fetch('/admin/orders');
    return await res.json();
  } catch (e) {
    console.error('fetchOrders', e);
    return [];
  }
}

function renderOrders(orders){
  if (!orders || orders.length === 0) {
    ordersRoot.innerHTML = '<p style="color:var(--muted)">No orders</p>';
    return;
  }
  ordersRoot.innerHTML = '';
  orders.slice().reverse().forEach(o => { // show newest first
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '12px';
    const time = new Date(o.time).toLocaleString();
    const total = o.items.reduce((s,i)=>s + i.price * i.qty, 0);
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong>Table ${o.table}</strong> — <small style="color:var(--muted)">${time}</small>
        </div>
        <div>
          <button data-id="${o.id}" class="status-btn" data-status="preparing">Preparing</button>
          <button data-id="${o.id}" class="status-btn" data-status="served">Served</button>
        </div>
      </div>
      <div style="margin-top:8px; color:var(--muted)">
        ${o.items.map(i => `<div>${i.name} × ${i.qty} — ₹${(i.price * i.qty).toFixed(2)}</div>`).join('')}
      </div>
      <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
        <div><strong>Total: ₹${total.toFixed(2)}</strong></div>
        <div style="color:var(--muted)">Status: <em>${o.status}</em></div>
      </div>
    `;
    ordersRoot.appendChild(card);
  });

  // add listeners to status buttons
  document.querySelectorAll('.status-btn').forEach(b=>{
    b.addEventListener('click', async (e)=>{
      const id = e.currentTarget.dataset.id;
      const status = e.currentTarget.dataset.status;
      await fetch(`/admin/orders/${id}/status`, {
        method:'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ status })
      });
      await loadAndRender();
    });
  });
}

async function loadAndRender(){
  const orders = await fetchOrders();
  renderOrders(orders);
}

refreshBtn.addEventListener('click', loadAndRender);
clearAllBtn.addEventListener('click', async ()=>{
  if (!confirm('Clear all orders?')) return;
  await fetch('/admin/orders', { method: 'DELETE' });
  await loadAndRender();
});

// auto-refresh every 4s
setInterval(loadAndRender, 4000);
loadAndRender();