const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public'))); //

const productsData = require('./data.js'); //

const products = productsData.map(product => ({
  ...product,
  // icon: product.hinhAnh ? `/${product.hinhAnh}` : '/default.png', // Current data.js uses emoji icons
  hetHang: product.hetHang || false,
  category: (() => {
    const name = product.tenSanPham?.toLowerCase() || '';
    if (name.includes('đèn') || name.includes('bóng') || name.includes('led') && !name.includes('mặt trời')) return 'Lighting'; //
    if (name.includes('năng lượng mặt trời') || name.includes('solar') || name.includes('nlmt')) return 'Solar'; //
    if (name.includes('phích') || name.includes('ổ cắm') || name.includes('đuôi')) return 'SocketsAndPlugs'; // (expanded)
    if (name.includes('cb') || name.includes('chống giật') || name.includes('aptomat') || name.includes('cầu dao')) return 'CircuitBreakers'; // (more specific)
    if (name.includes('kìm') || name.includes('cưa') || name.includes('kéo') ||
        name.includes('đá cắt') || name.includes('đá mài') || name.includes('nhám xếp') ||
        name.includes('lưỡi') && name.includes('cắt') || name.includes('khoan') || name.includes('đầu bắn') ||
        name.includes('khò gas') || name.includes('dụng cụ') || name.includes('bát mài')) return 'ToolsAndAccessories'; // (expanded)
    if (name.includes('vợt muỗi')) return 'MosquitoRackets'; //
    return 'Other'; //
  })()
})).filter(product => product.tenSanPham && product.tenSanPham.trim() !== ''); //

app.get('/api/products', (req, res) => { //
  let filteredProducts = [...products];
  if (req.query.search) {
    const searchTerm = req.query.search.toLowerCase();
    filteredProducts = filteredProducts.filter(p =>
      p.tenSanPham.toLowerCase().includes(searchTerm)
    );
  }
  if (req.query.hideOutOfStock === 'true') { //
    filteredProducts = filteredProducts.filter(p => !p.hetHang);
  }
  if (req.query.category) { //
    filteredProducts = filteredProducts.filter(p =>
      p.category.toLowerCase() === req.query.category.toLowerCase()
    );
  }
  res.json(filteredProducts);
});

app.get('/api/products/:id', (req, res) => { //
  const product = products.find(p => p.stt === parseInt(req.params.id));
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  }
});

app.post('/api/products/:id/toggle-stock', (req, res) => { //
  const product = products.find(p => p.stt === parseInt(req.params.id));
  if (product) {
    product.hetHang = !product.hetHang;
    res.json({ success: true, hetHang: product.hetHang });
  } else {
    res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  }
});

// Catch-all for SPA: Route all other GET requests to index.html
// This should be after API routes and specific static file handling if any.
// However, Vercel's routing in vercel.json usually handles this.
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

app.use((err, req, res, next) => { //
  console.error(err.stack);
  res.status(500).json({ error: 'Đã xảy ra lỗi server' });
});

module.exports = app; //
