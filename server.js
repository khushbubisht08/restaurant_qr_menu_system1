// // server.js
// const express = require('express');
// const fs = require('fs');
// const path = require('path');
// const { nanoid } = require('nanoid');
// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));

// // persistent orders file path
// const ORDERS_FILE = path.join(__dirname, 'orders.json');

// // helper: read orders from file
// function readOrders(){
//   try {
//     if (!fs.existsSync(ORDERS_FILE)) return [];
//     const data = fs.readFileSync(ORDERS_FILE, 'utf8');
//     return JSON.parse(data || '[]');
//   } catch (e) {
//     console.error('readOrders error', e);
//     return [];
//   }
// }

// // helper: write orders to file
// function writeOrders(orders){
//   fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
// }

// // endpoint: place an order (from customer)
// app.post('/order', (req, res) => {
//   const { table, items } = req.body || {};
//   if (!table || !items || !Array.isArray(items) || items.length === 0) {
//     return res.status(400).json({ success: false, message: 'Invalid order payload' });
//   }

//   const orders = readOrders();
//   const order = {
//     id: nanoid(8),
//     table,
//     items,
//     time: new Date().toISOString(),
//     status: 'new' // new -> preparing -> served / cancelled
//   };
//   orders.push(order);
//   try {
//     writeOrders(orders);
//     return res.json({ success: true, orderId: order.id });
//   } catch (e) {
//     console.error('write error', e);
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// // endpoint: list orders (admin)
// app.get('/admin/orders', (req, res) => {
//   const orders = readOrders();
//   res.json(orders);
// });

// // endpoint: update order status (mark preparing/served/cancel)
// app.post('/admin/orders/:id/status', (req, res) => {
//   const id = req.params.id;
//   const { status } = req.body;
//   const orders = readOrders();
//   const idx = orders.findIndex(o => o.id === id);
//   if (idx === -1) return res.status(404).json({ success: false, message: 'Order not found' });
//   orders[idx].status = status || orders[idx].status;
//   writeOrders(orders);
//   res.json({ success: true });
// });

// // endpoint: clear all orders (admin)
// app.delete('/admin/orders', (req, res) => {
//   writeOrders([]);
//   res.json({ success: true });
// });

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });


// ===== server.js =====
const express = require("express");
const fs = require("fs");
const path = require("path");
const { nanoid } = require("nanoid");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

const ordersFile = path.join(__dirname, "orders.json");

// Load existing orders or start empty
let orders = [];
if (fs.existsSync(ordersFile)) {
  const data = fs.readFileSync(ordersFile, "utf-8");
  orders = JSON.parse(data || "[]");
}

// ============ ROUTES ============

// 1️⃣ Receive customer order
app.post("/order", (req, res) => {
  const { table, items } = req.body;
  if (!table || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: "Invalid order data" });
  }

  const newOrder = {
    id: nanoid(6),
    table,
    items,
    time: new Date().toLocaleString(),
    status: "Pending"
  };

  orders.push(newOrder);
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));

  console.log(`✅ Order received from Table ${table}`);
  res.json({ success: true, orderId: newOrder.id });
});

// 2️⃣ Get all orders (Admin)
app.get("/admin/orders", (req, res) => {
  res.json(orders);
});

// 3️⃣ Update order status (Admin)
app.post("/admin/update", (req, res) => {
  const { id, status } = req.body;
  const order = orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });

  order.status = status;
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
  res.json({ success: true });
});

// 4️⃣ Clear all orders (Admin)
app.post("/admin/clear", (req, res) => {
  orders = [];
  fs.writeFileSync(ordersFile, "[]");
  res.json({ success: true });
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`👨‍🍳 Admin dashboard: http://localhost:${PORT}/admin.html`);
});
