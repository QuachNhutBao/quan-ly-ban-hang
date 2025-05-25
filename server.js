const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const productsData = require('./data.js');

const products = productsData.map(product => ({
  ...product,
  icon: product.hinhAnh ? `/${product.hinhAnh}` : '/default.png',
  hetHang: product.hetHang || false,
  category: (() => {
    const name = product.tenSanPham?.toLowerCase() || '';
    if (name.includes('đèn') || name.includes('bóng')) return 'Lighting';
    if (name.includes('điện mặt trời') || name.includes('solar')) return 'Solar';
    if (name.includes('công tắc') || name.includes('ổ cắm')) return 'Sockets';
    if (name.includes('máy cắt')) return 'CircuitBreakers';
    if (name.includes('dụng cụ')) return 'Tools';
    if (name.includes('muỗi')) return 'MosquitoRackets';
    return 'Other';
  })()
})).filter(product => product.tenSanPham && product.tenSanPham.trim() !== '');

app.get('/api/products', (req, res) => {
  let filteredProducts = [...products];
  if (req.query.search) {
    const searchTerm = req.query.search.toLowerCase();
    filteredProducts = filteredProducts.filter(p =>
      p.tenSanPham.toLowerCase().includes(searchTerm)
    );
  }
  if (req.query.hideOutOfStock === 'true') {
    filteredProducts = filteredProducts.filter(p => !p.hetHang);
  }
  if (req.query.category) {
    filteredProducts = filteredProducts.filter(p =>
      p.category.toLowerCase() === req.query.category.toLowerCase()
    );
  }
  res.json(filteredProducts);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.stt === parseInt(req.params.id));
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  }
});

app.post('/api/products/:id/toggle-stock', (req, res) => {
  const product = products.find(p => p.stt === parseInt(req.params.id));
  if (product) {
    product.hetHang = !product.hetHang;
    res.json({ success: true, hetHang: product.hetHang });
  } else {
    res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Đã xảy ra lỗi server' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
