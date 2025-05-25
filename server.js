const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Import dữ liệu sản phẩm
const productsData = require('./data.js');

// Dữ liệu sản phẩm
let products = [...productsData];

console.log(`🗂️  Đã load ${products.length} sản phẩm từ database`);

// API Routes
app.get('/api/products', (req, res) => {
  const { search, hideOutOfStock } = req.query;
  let filteredProducts = [...products];
  
  // Lọc theo tìm kiếm
  if (search) {
    const searchTerm = search.toLowerCase();
    filteredProducts = filteredProducts.filter(product => 
      product.tenSanPham.toLowerCase().includes(searchTerm)
    );
  }
  
  // Ẩn sản phẩm hết hàng
  if (hideOutOfStock === 'true') {
    filteredProducts = filteredProducts.filter(product => !product.hetHang);
  }
  
  res.json(filteredProducts);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.stt == req.params.id);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  }
});

// Cập nhật trạng thái hết hàng
app.put('/api/products/:id/toggle-stock', (req, res) => {
  const product = products.find(p => p.stt == req.params.id);
  if (product) {
    product.hetHang = !product.hetHang;
    res.json(product);
  } else {
    res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  }
});

// Cập nhật số lượng tồn
app.put('/api/products/:id/update-stock', (req, res) => {
  const { soLuongTon } = req.body;
  const product = products.find(p => p.stt == req.params.id);
  if (product) {
    product.soLuongTon = parseInt(soLuongTon);
    if (product.soLuongTon <= 0) {
      product.hetHang = true;
    }
    res.json(product);
  } else {
    res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server sẵn sàng với dữ liệu đã load

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📱 Truy cập bằng điện thoại tại: http://[IP-của-bạn]:${PORT}`);
});
