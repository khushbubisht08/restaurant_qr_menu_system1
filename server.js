// // // server.js
// // const express = require('express');
// // const fs = require('fs');
// // const path = require('path');
// // const { nanoid } = require('nanoid');
// // const app = express();
// // const PORT = process.env.PORT || 3000;

// // app.use(express.json());
// // app.use(express.static(path.join(__dirname, 'public')));

// // // persistent orders file path
// // const ORDERS_FILE = path.join(__dirname, 'orders.json');

// // // helper: read orders from file
// // function readOrders(){
// //   try {
// //     if (!fs.existsSync(ORDERS_FILE)) return [];
// //     const data = fs.readFileSync(ORDERS_FILE, 'utf8');
// //     return JSON.parse(data || '[]');
// //   } catch (e) {
// //     console.error('readOrders error', e);
// //     return [];
// //   }
// // }

// // // helper: write orders to file
// // function writeOrders(orders){
// //   fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
// // }

// // // endpoint: place an order (from customer)
// // app.post('/order', (req, res) => {
// //   const { table, items } = req.body || {};
// //   if (!table || !items || !Array.isArray(items) || items.length === 0) {
// //     return res.status(400).json({ success: false, message: 'Invalid order payload' });
// //   }

// //   const orders = readOrders();
// //   const order = {
// //     id: nanoid(8),
// //     table,
// //     items,
// //     time: new Date().toISOString(),
// //     status: 'new' // new -> preparing -> served / cancelled
// //   };
// //   orders.push(order);
// //   try {
// //     writeOrders(orders);
// //     return res.json({ success: true, orderId: order.id });
// //   } catch (e) {
// //     console.error('write error', e);
// //     return res.status(500).json({ success: false, message: 'Server error' });
// //   }
// // });

// // // endpoint: list orders (admin)
// // app.get('/admin/orders', (req, res) => {
// //   const orders = readOrders();
// //   res.json(orders);
// // });

// // // endpoint: update order status (mark preparing/served/cancel)
// // app.post('/admin/orders/:id/status', (req, res) => {
// //   const id = req.params.id;
// //   const { status } = req.body;
// //   const orders = readOrders();
// //   const idx = orders.findIndex(o => o.id === id);
// //   if (idx === -1) return res.status(404).json({ success: false, message: 'Order not found' });
// //   orders[idx].status = status || orders[idx].status;
// //   writeOrders(orders);
// //   res.json({ success: true });
// // });

// // // endpoint: clear all orders (admin)
// // app.delete('/admin/orders', (req, res) => {
// //   writeOrders([]);
// //   res.json({ success: true });
// // });

// // app.listen(PORT, () => {
// //   console.log(`Server running on http://localhost:${PORT}`);
// // });


// // ===== server.js =====
// const express = require("express");
// const fs = require("fs");
// const path = require("path");
// const { nanoid } = require("nanoid");

// const app = express();
// const PORT = 3000;

// // Middleware
// app.use(express.json());
// app.use(express.static("public"));

// const ordersFile = path.join(__dirname, "orders.json");

// // Load existing orders or start empty
// let orders = [];
// if (fs.existsSync(ordersFile)) {
//   const data = fs.readFileSync(ordersFile, "utf-8");
//   orders = JSON.parse(data || "[]");
// }

// // ============ ROUTES ============

// // 1️⃣ Receive customer order
// app.post("/order", (req, res) => {
//   const { table, items } = req.body;
//   if (!table || !items || items.length === 0) {
//     return res.status(400).json({ success: false, message: "Invalid order data" });
//   }

//   const newOrder = {
//     id: nanoid(6),
//     table,
//     items,
//     time: new Date().toLocaleString(),
//     status: "Pending"
//   };

//   orders.push(newOrder);
//   fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));

//   console.log(`✅ Order received from Table ${table}`);
//   res.json({ success: true, orderId: newOrder.id });
// });

// // 2️⃣ Get all orders (Admin)
// app.get("/admin/orders", (req, res) => {
//   res.json(orders);
// });

// // 3️⃣ Update order status (Admin)
// app.post("/admin/update", (req, res) => {
//   const { id, status } = req.body;
//   const order = orders.find(o => o.id === id);
//   if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//   order.status = status;
//   fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
//   res.json({ success: true });
// });

// // 4️⃣ Clear all orders (Admin)
// app.post("/admin/clear", (req, res) => {
//   orders = [];
//   fs.writeFileSync(ordersFile, "[]");
//   res.json({ success: true });
// });

// // ============ START SERVER ============
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
//   console.log(`👨‍🍳 Admin dashboard: http://localhost:${PORT}/admin.html`);
// });
// ===== server.js =====
const express = require("express");
const fs = require("fs");
const path = require("path");
const { nanoid } = require("nanoid");
const QRCode = require("qrcode"); // NEW: Import QRCode

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

// ============ QR CODE ROUTES (UPDATED) ============

// Get server IP address
function getServerIP(req) {
  const host = req.headers.host;
  
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return `${iface.address}:3000`;
        }
      }
    }
  }
  
  return host;
}

// Generate single QR code for table selection
app.get("/qr/single", async (req, res) => {
  try {
    const serverHost = getServerIP(req);
    const url = `http://${serverHost}/table-select.html`;
    
    const qrDataURL = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    res.json({ success: true, qrCode: qrDataURL, url: url });
  } catch (error) {
    console.error("QR generation error:", error);
    res.status(500).json({ success: false, message: "Failed to generate QR code" });
  }
});

// Get all QR codes at once
app.get("/qr/all/tables", async (req, res) => {
  try {
    const qrCodes = [];
    const host = req.headers.host;
    
    for (let table = 1; table <= 9; table++) {
      const url = `http://${host}/customer.html?table=${table}`;
      const qrDataURL = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2
      });
      qrCodes.push({ table, qrCode: qrDataURL, url });
    }
    
    res.json({ success: true, qrCodes });
  } catch (error) {
    console.error("QR generation error:", error);
    res.status(500).json({ success: false, message: "Failed to generate QR codes" });
  }
});

// ============ EXISTING ORDER ROUTES ============

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
  console.log(`📱 QR Codes: http://localhost:${PORT}/qr-display.html`);
  console.log(`👨‍💼 Admin dashboard: http://localhost:${PORT}/admin.html`);
});