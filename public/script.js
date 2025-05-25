const productList = document.getElementById('productList');
const searchInput = document.getElementById('search');
const categorySelect = document.getElementById('category');
const hideOutOfStock = document.getElementById('hideOutOfStock');
const applyFilters = document.getElementById('applyFilters');
const loading = document.getElementById('loading');
const cartSidebar = document.getElementById('cartSidebar');
const toggleCart = document.getElementById('toggleCart');
const cartItems = document.getElementById('cartItems');
const cartSummary = document.getElementById('cartSummary');
const clearCart = document.getElementById('clearCart');
const productModal = document.getElementById('productModal');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');

let cart = JSON.parse(localStorage.getItem('cart')) || [];
const isAdmin = false; // Replace with authentication logic

function parsePriceString(price) {
  return parseInt(price.replace(/\D/g, '')) || 0;
}

async function fetchProducts(search = '', hideOutOfStock = false, category = '') {
  try {
    loading.style.display = 'block';
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
  } finally {
    loading.style.display = 'none';
  }
}

function renderProducts(products) {
  productList.innerHTML = '';
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${product.icon}" alt="${product.tenSanPham}">
      <h3>${product.tenSanPham}</h3>
      <p>Giá: ${product.giaSauCK || 'Liên hệ'} VNĐ</p>
      ${product.hetHang ? '<p style="color:red;">Hết hàng</p>' : ''}
      <div class="product-actions">
        <button class="btn add-to-cart" data-id="${product.stt}">Thêm vào giỏ</button>
        ${isAdmin ? '<button class="btn toggle-stock" data-id="${product.stt}">${product.hetHang ? "Còn hàng" : "Hết hàng"}</button>' : ''}
      </div>
    `;
    productList.appendChild(card);
  });
  document.querySelectorAll('.add-to-cart').forEach(btn =>
    btn.addEventListener('click', addToCart));
  if (isAdmin) {
    document.querySelectorAll('.toggle-stock').forEach(btn =>
      btn.addEventListener('click', toggleStock));
  }
}

function addToCart(e) {
  const id = parseInt(e.target.dataset.id);
  const product = products.find(p => p.stt === id);
  if (product && !product.hetHang) {
    cart.push({ id, quantity: 1, price: parsePriceString(product.giaSauCK || '0') });
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartSummary();
    showToast('Đã thêm vào giỏ hàng', 'success');
  } else {
    showToast('Sản phẩm hết hàng hoặc không tồn tại', 'error');
  }
}

async function toggleStock(e) {
  const id = parseInt(e.target.dataset.id);
  const response = await fetch(`/api/products/${id}/toggle-stock`, { method: 'POST' });
  if (response.ok) {
    const { hetHang } = await response.json();
    fetchProducts(searchInput.value, hideOutOfStock.checked, categorySelect.value)
      .then(renderProducts);
    showToast(`Sản phẩm ${hetHang ? 'hết' : 'còn'} hàng`, 'info');
  }
}

async function renderCart() {
  cartItems.innerHTML = '';
  const updatedCart = [];
  for (const item of cart) {
    const response = await fetch(`/api/products/${item.id}`);
    if (response.ok) {
      const product = await response.json();
      const finalPrice = product.giaHoaGia && product.giaHoaGia !== '' ? product.giaHoaGia : product.giaSauCK;
      updatedCart.push({ ...item, price: parsePriceString(finalPrice) });
      const cartItem = document.createElement('div');
      cartItem.innerHTML = `${product.tenSanPham} x${item.quantity} - ${finalPrice} VNĐ`;
      cartItems.appendChild(cartItem);
    }
  }
  cart = updatedCart;
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartSummary();
}

function updateCartSummary() {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartSummary.textContent = `Tổng: ${total.toLocaleString()} VNĐ`;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showProductModal(product) {
  modalContent.innerHTML = `
    <h2>${product.tenSanPham}</h2>
    <img src="${product.icon}" alt="${product.tenSanPham}">
    <p>Giá gốc: ${product.giaGoc || 'Liên hệ'} VNĐ</p>
    <p>Giá sau chiết khấu: ${product.giaSauCK || 'Liên hệ'} VNĐ</p>
    ${product.hetHang ? '<p style="color:red;">Hết hàng</p>' : ''}
    <button class="btn add-to-cart" data-id="${product.stt}">Thêm vào giỏ</button>
  `;
  productModal.style.display = 'block';
  document.querySelector('.add-to-cart').addEventListener('click', addToCart);
}

applyFilters.addEventListener('click', () => {
  fetchProducts(searchInput.value, hideOutOfStock.checked, categorySelect.value)
    .then(renderProducts);
});

toggleCart.addEventListener('click', () => {
  cartSidebar.classList.toggle('open');
  renderCart();
});

clearCart.addEventListener('click', () => {
  cart = [];
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
  showToast('Giỏ hàng đã được xóa', 'info');
});

closeModal.addEventListener('click', () => {
  productModal.style.display = 'none';
});

productList.addEventListener('click', (e) => {
  if (e.target.classList.contains('product-card')) {
    const id = parseInt(e.target.querySelector('.add-to-cart')?.dataset.id);
    fetch(`/api/products/${id}`).then(res => res.json()).then(showProductModal);
  }
});

fetchProducts().then(renderProducts);
