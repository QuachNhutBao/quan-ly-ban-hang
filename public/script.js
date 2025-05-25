// Global State
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let filteredProducts = [];

// DOM Elements
const searchInput = document.getElementById('searchInput');
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

// Utility Functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount).replace('₫', 'đ');
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
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function getProductIcon(productName) {
  const name = productName.toLowerCase();
  if (name.includes('led') || name.includes('đèn')) return '💡';
  if (name.includes('ổ cắm') || name.includes('socket')) return '🔌';
  if (name.includes('dây') || name.includes('cable')) return '🔗';
  if (name.includes('quạt')) return '🌀';
  if (name.includes('công tắc')) return '⚡';
  return '⚙️';
}

// API Functions
async function fetchProducts(search = '', hideOutOfStock = false) {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (hideOutOfStock) params.append('hideOutOfStock', 'true');
    
    const response = await fetch(`/api/products?${params}`);
    if (!response.ok) throw new Error('Lỗi tải dữ liệu');
    
    return await response.json();
  } catch (error) {
    console.error('Lỗi fetch products:', error);
    showToast('Lỗi tải dữ liệu sản phẩm', 'error');
    return [];
  }
}

async function toggleProductStock(productId) {
  try {
    const response = await fetch(`/api/products/${productId}/toggle-stock`, {
      method: 'PUT'
    });
    
    if (!response.ok) throw new Error('Lỗi toggle stock');
    const updatedProduct = await response.json();
    
    // Cập nhật sản phẩm trong danh sách local
    const productIndex = products.findIndex(p => p.stt === productId);
    if (productIndex !== -1) {
      products[productIndex] = updatedProduct;
    }
    
    showToast(`Đã chuyển trạng thái: ${updatedProduct.hetHang ? 'HẾT HÀNG' : 'CÒN HÀNG'}`);
    
    // Refresh hiển thị
    await searchProducts();
    
    return updatedProduct;
  } catch (error) {
    console.error('Lỗi toggle stock:', error);
    showToast('Lỗi thay đổi trạng thái hàng', 'error');
    return null;
  }
}

// Render Functions
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
    // Xử lý giá cuối cùng - ưu tiên giaHoaGia, nếu không có thì dùng giaSauCK
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
        <div class="price-row">
          <span class="price-label">Giá gốc:</span>
          <span class="price-value price-original">${product.giaGoc}</span>
        </div>` : ''}
        
        ${product.chietKhau && product.chietKhau !== '' ? `
        <div class="price-row">
          <span class="price-label">Sau CK (${product.chietKhau}):</span>
          <span class="price-value price-discount">${product.giaSauCK}</span>
        </div>` : ''}
        
        ${product.khuyenMai && product.khuyenMai !== '' ? `
        <div class="price-row">
          <span class="price-label">Giá bán (KM ${product.khuyenMai}):</span>
          <span class="price-value price-final">${finalPrice}</span>
        </div>` : `
        <div class="price-row">
          <span class="price-label">Giá bán:</span>
          <span class="price-value price-final">${finalPrice}</span>
        </div>`}
      </div>
      
      <div class="stock-info">
        <span class="stock-status ${product.hetHang ? 'out-of-stock' : 'in-stock'}">
          ${product.hetHang ? '❌ Hết hàng' : '✅ Còn hàng'}
        </span>
      </div>
      
      <div class="product-actions">
        <button class="btn btn-primary" onclick="addToCart(${product.stt})" ${product.hetHang ? 'disabled' : ''}>
          🛒 Thêm vào đơn
        </button>
        <button class="btn btn-secondary" onclick="showProductDetail(${product.stt})">
          📋 Chi tiết
        </button>
      </div>
    </div>
  `}).join('');
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
          <input type="number" class="quantity-input" value="${item.quantity}" 
                 onchange="updateCartQuantity(${item.id}, this.value)" min="1">
          <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
          <button class="btn btn-danger" onclick="removeFromCart(${item.id})" style="margin-left: 0.5rem;">
            🗑️
          </button>
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
  
  // Update cart badge visibility
  cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
}

// Cart Functions
function addToCart(productId) {
  const product = products.find(p => p.stt === productId);
  if (!product || product.hetHang) return;
  
  // Lấy giá cuối cùng để thêm vào giỏ hàng
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
    cart.push({
      id: productId,
      name: product.tenSanPham,
      price: price,
      quantity: 1,
      dvt: product.dvt
    });
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
  
  if (isOpen) {
    cartSidebar.classList.remove('open');
    cartOverlay.classList.remove('open');
  } else {
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('open');
    renderCart();
  }
}

function createOrder() {
  if (cart.length === 0) {
    showToast('Đơn hàng trống', 'error');
    return;
  }
  
  const orderDetails = cart.map(item => 
    `${item.name} - SL: ${item.quantity} ${item.dvt} - Giá: ${formatCurrency(item.price * item.quantity)}`
  ).join('\n');
  
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const orderText = `📋 ĐƠN HÀNG VINAHOUS\n\n${orderDetails}\n\n💰 TỔNG CỘNG: ${formatCurrency(totalAmount)}\n\n🕐 Thời gian: ${new Date().toLocaleString('vi-VN')}`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(orderText).then(() => {
    showToast('Đã copy đơn hàng vào clipboard!');
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    toggleCart();
  }).catch(() => {
    // Fallback: show in alert
    alert(orderText);
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    toggleCart();
  });
}

// Search & Filter Functions
async function searchProducts() {
  const searchTerm = searchInput.value.trim();
  const hideOutOfStock = document.getElementById('hideOutOfStock').checked;
  
  loading.style.display = 'block';
  productsGrid.style.display = 'none';
  emptyState.style.display = 'none';
  
  const results = await fetchProducts(searchTerm, hideOutOfStock);
  filteredProducts = results;
  renderProducts(results);
}

async function filterProducts() {
  await searchProducts();
}

// Modal Functions
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
      <div class="detail-row">
        <span>Quy cách:</span>
        <span>${product.quyCache || 'Không có'}</span>
      </div>
      <div class="detail-row">
        <span>Đơn vị tính:</span>
        <span>${product.dvt}</span>
      </div>
      <div class="detail-row">
        <span>Trạng thái:</span>
        <span class="${product.hetHang ? 'out-of-stock' : 'in-stock'}">${product.hetHang ? 'Hết hàng' : 'Còn hàng'}</span>
      </div>
      
      <h4>Thông tin giá</h4>
      ${product.giaGoc && product.giaGoc !== '' ? `
      <div class="detail-row">
        <span>Giá gốc:</span>
        <span>${product.giaGoc}</span>
      </div>` : ''}
      
      ${product.chietKhau && product.chietKhau !== '' ? `
      <div class="detail-row">
        <span>Chiết khấu:</span>
        <span>${product.chietKhau}</span>
      </div>
      <div class="detail-row">
        <span>Giá sau CK:</span>
        <span>${product.giaSauCK}</span>
      </div>` : ''}
      
      ${product.khuyenMai && product.khuyenMai !== '' ? `
      <div class="detail-row">
        <span>Khuyến mãi:</span>
        <span>${product.khuyenMai}</span>
      </div>` : ''}
      
      <div class="detail-row" style="font-weight: 600; color: var(--secondary-color);">
        <span>Giá bán cuối:</span>
        <span>${finalPrice}</span>
      </div>
      
      <div class="detail-actions" style="margin-top: 1.5rem; display: flex; gap: 0.5rem;">
        <button class="btn btn-primary" onclick="addToCart(${product.stt}); closeModal();" ${product.hetHang ? 'disabled' : ''}>
          🛒 Thêm vào đơn
        </button>
        <button class="btn btn-secondary" onclick="toggleProductStock(${product.stt}); closeModal();">
          ${product.hetHang ? '✅ Đánh dấu có hàng' : '❌ Đánh dấu hết hàng'}
        </button>
      </div>
    </div>
  `;
  
  modal.classList.add('open');
  modalOverlay.classList.add('open');
}

function closeModal() {
  const modal = document.getElementById('productModal');
  const modalOverlay = document.getElementById('modalOverlay');
  
  modal.classList.remove('open');
  modalOverlay.classList.remove('open');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
  // Initial load
  products = await fetchProducts();
  filteredProducts = products;
  renderProducts(products);
  updateCartSummary();
  
  // Search on Enter
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchProducts();
    }
  });
  
  // Auto search with debounce
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(searchProducts, 300);
  });
});

// CSS for modal detail styling
const style = document.createElement('style');
style.textContent = `
  .product-detail .detail-icon {
    font-size: 3rem;
    text-align: center;
    margin-bottom: 1rem;
  }
  
  .product-detail h4 {
    margin: 1.5rem 0 1rem 0;
    color: var(--gray-700);
    border-bottom: 1px solid var(--gray-200);
    padding-bottom: 0.5rem;
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--gray-100);
  }
  
  .detail-row:last-child {
    border-bottom: none;
  }
  
  .in-stock {
    color: var(--secondary-color);
    font-weight: 600;
  }
  
  .out-of-stock {
    color: var(--danger-color);
    font-weight: 600;
  }
`;
document.head.appendChild(style);
