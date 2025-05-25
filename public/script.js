let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let filteredProducts = [];
let isAdmin = true; // Simulated admin check (replace with actual auth logic)

const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const productsGrid = document.getElementById('productsGrid');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('emptyState');
const resultsCount = document.getElementById('resultsCount');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartItems = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const finalTotal = document.getElementById('finalTotal');

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', 'đ');
}

function parsePriceString(priceStr) {
  if (!priceStr || priceStr === '') return 0;
  return parseInt(priceStr.replace(/[^\d]/g, ''));
}

function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function fetchProducts(search = '', hideOutOfStock = false, category = '') {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (hideOutOfStock) params.append('hideOutOfStock', 'true');
    if (category) params.append('category', category);
    
    const response = await fetch(`/api/products?${params}`);
    if (!response.ok) throw new Error('Lỗi tải dữ liệu');
    return await response.json();
  } catch (error) {
    console.error('Lỗi fetch products:', error);
    showToast('Lỗi tải dữ liệu sản phẩm', 'error');
    return [];
  }
}

async function updateProduct(productId, updateData) {
  try {
    const response = await fetch(`/api/products/${productId}/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    if (!response.ok) throw new Error('Lỗi cập nhật sản phẩm');
    const updatedProduct = await response.json();
    products = products.map(p => p.stt === productId ? updatedProduct : p);
    showToast(`Đã cập nhật ${updatedProduct.tenSanPham}`);
    return updatedProduct;
  } catch (error) {
    console.error('Lỗi update product:', error);
    showToast('Lỗi cập nhật sản phẩm', 'error');
    return null;
  }
}

async function toggleProductStock(productId) {
  try {
    const response = await fetch(`/api/products/${productId}/toggle-stock`, { method: 'PUT' });
    if (!response.ok) throw new Error('Lỗi toggle stock');
    const updatedProduct = await response.json();
    products = products.map(p => p.stt === productId ? updatedProduct : p);
    showToast(`Đã chuyển trạng thái: ${updatedProduct.hetHang ? 'HẾT HÀNG' : 'CÒN HÀNG'}`);
    await searchProducts();
    return updatedProduct;
  } catch (error) {
    console.error('Lỗi toggle stock:', error);
    showToast('Lỗi thay đổi trạng thái hàng', 'error');
    return null;
  }
}

function renderProducts(products) {
  loading.style.display = 'none';
  if (products.length === 0) {
    productsGrid.style.display = 'none';
    emptyState.style.display = 'block';
    resultsCount.textContent = 'Không tìm thấy sản phẩm';
    return;
  }
  
  productsGrid.style.display = 'grid';
  emptyState.style.display = 'none';
  resultsCount.textContent = `Tìm thấy ${products.length} sản phẩm`;
  
  productsGrid.innerHTML = products.map(product => {
    const finalPrice = product.giaHoaGia && product.giaHoaGia !== '' ? product.giaHoaGia : product.giaSauCK;
    return `
      <div class="product-card ${product.hetHang ? 'out-of-stock' : ''}" data-id="${product.stt}">
        ${product.hetHang ? '<div class="out-of-stock-badge">Hết hàng</div>' : ''}
        <div class="product-header">
          <span class="product-icon">${product.icon || '⚙️'}</span>
          <h3 class="product-name">${product.tenSanPham}</h3>
          <div class="product-specs">
            <span>${product.quyCache || ''}</span>
            <span>ĐVT: ${product.dvt}</span>
          </div>
        </div>
        <div class="product-pricing">
          ${product.giaGoc && product.giaGoc !== '' ? `
            <div class="price-row"><span class="price-label">Giá gốc:</span><span class="price-value price-original">${product.giaGoc}</span></div>` : ''}
          ${product.chietKhau && product.chietKhau !== '' ? `
            <div class="price-row"><span class="price-label">Sau CK (${product.chietKhau}):</span><span class="price-value price-discount">${product.giaSauCK}</span></div>` : ''}
          ${product.khuyenMai && product.khuyenMai !== '' ? `
            <div class="price-row"><span class="price-label">Giá bán (KM ${product.khuyenMai}):</span><span class="price-value price-final">${finalPrice}</span></div>` : `
            <div class="price-row"><span class="price-label">Giá bán:</span><span class="price-value price-final">${finalPrice}</span></div>`}
        </div>
        <div class="stock-info">
          <span class="stock-status ${product.hetHang ? 'out-of-stock' : 'in-stock'}">${product.hetHang ? '❌ Hết hàng' : '✅ Còn hàng'}</span>
        </div>
        <div class="product-actions">
          <button class="btn btn-primary" onclick="addToCart(${product.stt})" ${product.hetHang ? 'disabled' : ''}>🛒 Thêm vào đơn</button>
          <button class="btn btn-secondary" onclick="showProductDetail(${product.stt})">📋 Chi tiết</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderCart() {
  updateCartSummary();
  if (cart.length === 0) {
    cartItems.style.display = 'none';
    cartEmpty.style.display = 'block';
    return;
  }
  
  cartItems.style.display = 'block';
  cartEmpty.style.display = 'none';
  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatCurrency(item.price)}</div>
        <div class="quantity-controls">
          <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
          <input type="number" class="quantity-input" value="${item.quantity}" onchange="updateCartQuantity(${item.id}, this.value)" min="1">
          <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
          <button class="btn btn-danger" onclick="removeFromCart(${item.id})">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

function updateCartSummary() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  cartCount.textContent = totalItems;
  cartTotal.textContent = formatCurrency(totalAmount);
  finalTotal.textContent = formatCurrency(totalAmount);
  cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
}

function addToCart(productId) {
  const product = products.find(p => p.stt === productId);
  if (!product || product.hetHang) return;
  const finalPrice = product.giaHoaGia && product.giaHoaGia !== '' ? product.giaHoaGia : product.giaSauCK;
  const price = parsePriceString(finalPrice);
  if (price === 0) {
    showToast('Sản phẩm chưa có giá', 'error');
    return;
  }
  
  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ id: productId, name: product.tenSanPham, price: price, quantity: 1, dvt: product.dvt });
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
  showToast(`Đã thêm ${product.tenSanPham} vào đơn hàng`);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
  showToast('Đã xóa sản phẩm khỏi đơn hàng');
}

function updateCartQuantity(productId, newQuantity) {
  const quantity = parseInt(newQuantity);
  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }
  const item = cart.find(item => item.id === productId);
  if (item) {
    item.quantity = quantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
  }
}

function toggleCart() {
  const isOpen = cartSidebar.classList.contains('open');
  cartSidebar.classList.toggle('open', !isOpen);
  cartOverlay.classList.toggle('open', !isOpen);
  if (!isOpen) renderCart();
}

function createOrder() {
  if (cart.length === 0) {
    showToast('Đơn hàng trống', 'error');
    return;
  }
  const orderDetails = cart.map(item => `${item.name} - SL: ${item.quantity} ${item.dvt} - Giá: ${formatCurrency(item.price * item.quantity)}`).join('\n');
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const orderText = `📋 ĐƠN HÀNG VINAHOUS\n\n${orderDetails}\n\n💰 TỔNG CỘNG: ${formatCurrency(totalAmount)}\n\n🕐 Thời gian: ${new Date().toLocaleString('vi-VN')}`;
  navigator.clipboard.writeText(orderText).then(() => {
    showToast('Đã copy đơn hàng vào clipboard!');
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    toggleCart();
  }).catch(() => {
    alert(orderText);
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    toggleCart();
  });
}

async function searchProducts() {
  const searchTerm = searchInput.value.trim();
  const hideOutOfStock = document.getElementById('hideOutOfStock').checked;
  const category = categoryFilter.value;
  loading.style.display = 'block';
  productsGrid.style.display = 'none';
  emptyState.style.display = 'none';
  const results = await fetchProducts(searchTerm, hideOutOfStock, category);
  filteredProducts = results;
  renderProducts(results);
}

async function filterProducts() {
  await searchProducts();
}

function showProductDetail(productId) {
  const product = products.find(p => p.stt === productId);
  if (!product) return;
  const modal = document.getElementById('productModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalContent = document.getElementById('modalContent');
  const modalOverlay = document.getElementById('modalOverlay');
  modalTitle.textContent = product.tenSanPham;
  const finalPrice = product.giaHoaGia && product.giaHoaGia !== '' ? product.giaHoaGia : product.giaSauCK;
  
  modalContent.innerHTML = `
    <div class="product-detail">
      <div class="detail-icon">${product.icon || '⚙️'}</div>
      <h4>Thông tin sản phẩm</h4>
      <div class="detail-row"><span>Quy cách:</span><span>${product.quyCache || 'Không có'}</span></div>
      <div class="detail-row"><span>Đơn vị tính:</span><span>${product.dvt}</span></div>
      <div class="detail-row"><span>Trạng thái:</span><span class="${product.hetHang ? 'out-of-stock' : 'in-stock'}">${product.hetHang ? 'Hết hàng' : 'Còn hàng'}</span></div>
      <h4>Thông tin giá</h4>
      ${product.giaGoc && product.giaGoc !== '' ? `<div class="detail-row"><span>Giá gốc:</span><span>${product.giaGoc}</span></div>` : ''}
      ${product.chietKhau && product.chietKhau !== '' ? `<div class="detail-row"><span>Chiết khấu:</span><span>${product.chietKhau}</span></div><div class="detail-row"><span>Giá sau CK:</span><span>${product.giaSauCK}</span></div>` : ''}
      ${product.khuyenMai && product.khuyenMai !== '' ? `<div class="detail-row"><span>Khuyến mãi:</span><span>${product.khuyenMai}</span></div>` : ''}
      <div class="detail-row" style="font-weight: 600; color: var(--secondary-color);"><span>Giá bán cuối:</span><span>${finalPrice}</span></div>
      ${isAdmin ? `
        <h4>Chỉnh sửa sản phẩm</h4>
        <form id="editProductForm">
          <div class="form-group">
            <label>Tên sản phẩm</label>
            <input type="text" name="tenSanPham" value="${product.tenSanPham}" required>
          </div>
          <div class="form-group">
            <label>Quy cách</label>
            <input type="text" name="quyCache" value="${product.quyCache || ''}">
          </div>
          <div class="form-group">
            <label>Đơn vị tính</label>
            <input type="text" name="dvt" value="${product.dvt}" required>
          </div>
          <div class="form-group">
            <label>Giá gốc</label>
            <input type="text" name="giaGoc" value="${product.giaGoc || ''}">
          </div>
          <div class="form-group">
            <label>Chiết khấu</label>
            <input type="text" name="chietKhau" value="${product.chietKhau || ''}">
          </div>
          <div class="form-group">
            <label>Giá sau CK</label>
            <input type="text" name="giaSauCK" value="${product.giaSauCK || ''}">
          </div>
          <div class="form-group">
            <label>Khuyến mãi</label>
            <input type="text" name="khuyenMai" value="${product.khuyenMai || ''}">
          </div>
          <div class="form-group">
            <label>Giá hoa giá</label>
            <input type="text" name="giaHoaGia" value="${product.giaHoaGia || ''}">
          </div>
          <div class="form-group">
            <label>Hết hàng</label>
            <input type="checkbox" name="hetHang" ${product.hetHang ? 'checked' : ''}>
          </div>
          <button type="submit" class="btn btn-primary">Lưu thay đổi</button>
        </form>
      ` : ''}
      <div class="detail-actions">
        <button class="btn btn-primary" onclick="addToCart(${product.stt}); closeModal();" ${product.hetHang ? 'disabled' : ''}>🛒 Thêm vào đơn</button>
        <button class="btn btn-secondary" onclick="toggleProductStock(${product.stt}); closeModal();">${product.hetHang ? '✅ Đánh dấu có hàng' : '❌ Đánh dấu hết hàng'}</button>
      </div>
    </div>
  `;
  
  modal.classList.add('open');
  modalOverlay.classList.add('open');
  
  if (isAdmin) {
    const form = document.getElementById('editProductForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const updateData = {
        tenSanPham: formData.get('tenSanPham'),
        quyCache: formData.get('quyCache'),
        dvt: formData.get('dvt'),
        giaGoc: formData.get('giaGoc'),
        chietKhau: formData.get('chietKhau'),
        giaSauCK: formData.get('giaSauCK'),
        khuyenMai: formData.get('khuyenMai'),
        giaHoaGia: formData.get('giaHoaGia'),
        hetHang: formData.get('hetHang') === 'on'
      };
      await updateProduct(productId, updateData);
      await searchProducts();
      closeModal();
    });
  }
}

function closeModal() {
  const modal = document.getElementById('productModal');
  const modalOverlay = document.getElementById('modalOverlay');
  modal.classList.remove('open');
  modalOverlay.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', async () => {
  products = await fetchProducts();
  filteredProducts = products;
  renderProducts(products);
  updateCartSummary();
  
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchProducts();
  });
  
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(searchProducts, 300);
  });
  
  categoryFilter.addEventListener('change', searchProducts);
});

const style = document.createElement('style');
style.textContent = `
  .product-detail .detail-icon { font-size: 3rem; text-align: center; margin-bottom: 1rem; }
  .product-detail h4 { margin: 1.5rem 0 1rem 0; color: var(--gray-300); border-bottom: 1px solid var(--gray-700); padding-bottom: 0.5rem; }
  .detail-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--gray-700); }
  .detail-row:last-child { border-bottom: none; }
  .in-stock { color: var(--secondary-color); font-weight: 600; }
  .out-of-stock { color: var(--danger-color); font-weight: 600; }
  .form-group { margin-bottom: 1rem; }
  .form-group label { display: block; color: var(--gray-300); margin-bottom: 0.25rem; }
  .form-group input[type="text"], .form-group input[type="checkbox"] { width: 100%; padding: 0.5rem; border: 1px solid var(--gray-600); border-radius: 0.25rem; background: var(--gray-800); color: var(--gray-100); }
  .form-group input[type="checkbox"] { width: auto; }
`;
document.head.appendChild(style);
