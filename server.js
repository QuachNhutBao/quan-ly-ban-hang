const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Import product data
const productsData = require('./data.js');

// Process product data - add icons and ensure hetHang property
let products = productsData.map(product => {
  if (!product.icon && product.tenSanPham) {
    const name = product.tenSanPham?.toLowerCase() || '';
    if (name.includes('led') || name.includes('đèn') || name.includes('búp') || name.includes('âm trần')) {
      product.icon = '💡';
    } else if (name.includes('năng lượng mặt trời')) {
      product.icon = '☀️';
    } else if (name.includes('ổ cắm') || name.includes('phích') || name.includes('ổ dài') || name.includes('ổ quay')) {
      product.icon = '🔌';
    } else if (name.includes('chống giật') || name.includes('cb cóc') || name.includes('hộp')) {
      product.icon = '⚡';
    } else if (name.includes('đá cắt') || name.includes('khoan') || name.includes('cưa') || name.includes('kéo') || name.includes('kìm') || name.includes('khò') || name.includes('nhám')) {
      product.icon = '⚙️';
    } else if (name.includes('vợt muỗi')) {
      product.icon = '🦟';
    } else {
      product.icon = '⚙️';
    }
  }
  
  if (typeof product.hetHang === 'undefined') {
    product.hetHang = false;
  }
  
  // Add category based on product name
  product.category = name.includes('led') || name.includes('đèn') || name.includes('búp') || name.includes('âm trần') ? 'Lighting' :
                     name.includes('năng lượng mặt trời') ? 'Solar' :
                     name.includes('ổ cắm') || name.includes('phích') || name.includes('ổ dài') || name.includes('ổ quay') ? 'Sockets' :
                     name.includes('chống giật') || name.includes('cb cóc') || name.includes('hộp') ? 'CircuitBreakers' :
                     name.includes('đá cắt') || name.includes('khoan') || name.includes('cưa') || name.includes('kéo') || name.includes('kìm') || name.includes('khò') || name.includes('nhám') ? 'Tools' :
                     name.includes('vợt muỗi') ? 'MosquitoRackets' : 'Other';
  
  return product;
});

// Filter out empty products
products = products.filter(product => product.tenSanPham && product.tenSanPham.trim() !== '');

console.log(`🗂️ Đã load ${products.length} sản phẩm từ database`);

// API Routes
app.get('/api/products', (req, res) => {
  const { search, hideOutOfStock, category } = req.query;
  let filteredProducts = [...products];
  
  // Filter by search term
  if (search) {
    const searchTerm = search.toLowerCase();
    filteredProducts = filteredProducts.filter(product => 
      product.tenSanPham.toLowerCase().includes(searchTerm)
    );
  }
  
  // Filter by category
  if (category) {
    filteredProducts = filteredProducts.filter(product => product.category === category);
  }
  
  // Hide out-of-stock products
  if (hideOutOfStock === 'true') {
    filteredProducts = filteredProducts.filter(product => !product.hetHang);
  }
  
  res.json(filteredProducts);
});

// Other endpoints remain unchanged
app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.stt == req.params.id);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  }
});

app.put('/api/products/:id/toggle-stock', (req, res) => {
  const product = products.find(p => p.stt === parseInt(req.params.id));
  if (product) {
    product.hetHang = !product.hetHang;
    console.log(`📦 Sản phẩm ${product.tenSanPham} đã chuyển trạng thái: ${product.hetHang ? 'HẾT HÀNG' : 'CÒN HÀNG'}`);
    res.json(product);
  } else {
    res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  }
});

app.put('/api/products/:id/update', (req, res) => {
  const product = products.find(p => p.stt == req.params.id);
  if (product) {
    const updateData = req.body;
    const allowedFields = ['tenSanPham', 'quyCache', 'dvt', 'giaGoc', 'chietKhau', 'giaSauCK', 'khuyenMai', 'giaHoaGia', 'hetHang'];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        product[field] = updateData[field];
      }
    });
    
    console.log(`✏️ Đã cập nhật thông tin sản phẩm: ${product.tenSanPham}`);
    res.json(product);
  } else {
    res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  }
});

app.get('/api/stats', (req, res) => {
  const totalProducts = products.length;
  const inStockProducts = products.filter(p => !p.hetHang).length;
  const outOfStockProducts = products.filter(p => p.hetHang).length;
  
  res.json({
    total: totalProducts,
    inStock: inStockProducts,
    outOfStock: outOfStockProducts,
    stockPercentage: Math.round((inStockProducts / totalProducts) * 100)
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: '🚀 API Vinahous đang hoạt động!', 
    timestamp: new Date().toISOString(),
    totalProducts: products.length 
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint không tồn tại' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server Vinahous đang chạy tại http://localhost:${PORT}`);
  console.log(`📱 Truy cập bằng điện thoại tại: http://[IP-của-bạn]:${PORT}`);
  console.log(`📊 Tổng số sản phẩm: ${products.length}`);
  console.log(`✅ Còn hàng: ${products.filter(p => !p.hetHang).length}`);
  console.log(`❌ Hết hàng: ${products.filter(p => p.hetHang).length}`);
});
