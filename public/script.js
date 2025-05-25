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
const isAdmin = false; // Replace with authentication logic if needed

function parsePriceString(price) {
  if (typeof price !== 'string') price = String(price);
  return parseInt(price.replace(/\D/g, '')) || 0;
}

async function fetchProducts(search = '', hideOutOfStockParam = false, category = '') {
  try {
    loading.style.display = 'block';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (hideOutOfStockParam) params.append('hideOutOfStock', 'true');
    if (category) params.append('category', category);
    
    const response = await fetch(`/api/products?${params.toString()}`); //
    if (!response.ok) throw new Error('Lỗi tải dữ liệu sản phẩm');
    const products = await response.json();
    renderProducts(products); // Call renderProducts with the fetched products
    return products;
  } catch (error) {
    console.error('Lỗi fetch products:', error);
    showToast('Lỗi tải dữ liệu sản phẩm', 'error');
    return [];
  } finally {
    loading.style.display = 'none';
  }
}

function renderProducts(productsToRender) {
  productList.innerHTML = '';
  if (!productsToRender || productsToRender.length === 0) {
    productList.innerHTML = '<p>Không tìm thấy sản phẩm nào.</p>';
    return;
  }
  productsToRender.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.stt; // Add product ID for modal click
    card.innerHTML = `
      <img src="${product.icon}" alt="${product.tenSanPham}" loading="lazy">
      <h3>${product.tenSanPham}</h3>
      <p>Giá: ${product.giaSauCK || 'Liên hệ'}</p>
      ${product.hetHang ? '<p style="color:red;">Hết hàng</p>' : ''}
      <div class="product-actions">
        <button class="btn add-to-cart" data-id="${product.stt}" ${product.hetHang ? 'disabled' : ''}>Thêm vào giỏ</button>
        ${isAdmin ? `<button class="btn toggle-stock" data-id="${product.stt}">${product.hetHang ? "Còn hàng" : "Hết hàng"}</button>` : ''}
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

async function addToCart(e) {
  const id = parseInt(e.target.dataset.id);
  try {
    loading.style.display = 'block';
    const productResponse = await fetch(`/api/products/${id}`); //
    if (!productResponse.ok) {
      showToast('Không tìm thấy sản phẩm.', 'error');
      loading.style.display = 'none';
      return;
    }
    const product = await productResponse.json();

    if (product.hetHang) {
      showToast('Sản phẩm đã hết hàng.', 'error');
      loading.style.display = 'none';
      return;
    }

    const priceString = product.giaSauCK || '0';
    const price = parsePriceString(priceString);

    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: product.stt,
        name: product.tenSanPham,
        quantity: 1,
        price: price // Price at the time of adding to cart
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    await renderCart(); // Update cart display and summary
    showToast('Đã thêm vào giỏ hàng!', 'success');

  } catch (error) {
    console.error('Lỗi khi thêm vào giỏ hàng:', error);
    showToast('Lỗi khi thêm sản phẩm vào giỏ.', 'error');
  } finally {
    loading.style.display = 'none';
  }
}

async function toggleStock(e) {
  const id = parseInt(e.target.dataset.id);
  try {
    const response = await fetch(`/api/products/${id}/toggle-stock`, { method: 'POST' }); //
    if (response.ok) {
      const { hetHang } = await response.json();
      fetchProducts(searchInput.value, hideOutOfStock.checked, categorySelect.value);
      showToast(`Sản phẩm ${hetHang ? 'đã được đánh dấu hết' : 'còn'} hàng`, 'info');
    } else {
      showToast('Lỗi cập nhật trạng thái sản phẩm.', 'error');
    }
  } catch (error) {
    console.error('Lỗi toggleStock:', error);
    showToast('Lỗi kết nối khi cập nhật trạng thái.', 'error');
  }
}

async function renderCart() {
  cartItems.innerHTML = '';
  if (cart.length === 0) {
    cartItems.innerHTML = '<p>Giỏ hàng của bạn đang trống.</p>';
    updateCartSummary();
    return;
  }

  for (const item of cart) {
    // Fetch fresh product details for display consistency (name, current prices)
    // This also confirms product existence if somehow cart has an invalid item.
    let productDetails;
    try {
      const response = await fetch(`/api/products/${item.id}`); //
      if (response.ok) {
          productDetails = await response.json();
      }
    } catch (fetchError) {
      console.warn(`Could not fetch details for cart item ${item.id}:`, fetchError);
    }


    const cartItemDiv = document.createElement('div');
    cartItemDiv.className = 'cart-item-entry';

    const productName = productDetails ? productDetails.tenSanPham : item.name; // Fallback to stored name
    // Display giaHoaGia if available, otherwise giaSauCK, fallback to stored item price if fetch failed
    const displayPriceString = productDetails
                               ? (productDetails.giaHoaGia && productDetails.giaHoaGia.trim() !== '' ? productDetails.giaHoaGia : productDetails.giaSauCK)
                               : `${item.price.toLocaleString()} đ`;

    cartItemDiv.innerHTML = `
      <span class="cart-item-name">${productName} (x${item.quantity})</span>
      <div class="cart-item-details">
        <span class="cart-item-price">${displayPriceString}</span>
      </div>
      <button class="remove-from-cart" data-id="${item.id}" aria-label="Xóa ${productName} khỏi giỏ hàng">Xóa</button>
    `;
    cartItems.appendChild(cartItemDiv);
  }
  updateCartSummary();

  document.querySelectorAll('.remove-from-cart').forEach(button => {
    button.addEventListener('click', removeFromCart);
  });
}

function removeFromCart(e) {
  const idToRemove = parseInt(e.target.dataset.id);
  const itemIndex = cart.findIndex(item => item.id === idToRemove);

  if (itemIndex > -1) {
    if (cart[itemIndex].quantity > 1) {
      cart[itemIndex].quantity -= 1;
    } else {
      cart.splice(itemIndex, 1);
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart(); // Re-render the cart display
    showToast('Đã cập nhật giỏ hàng', 'info');
  }
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
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 500); // Remove after fade out
  }, 3000);
}

async function showProductModal(product) {
  modalContent.innerHTML = `
    <h2>${product.tenSanPham}</h2>
    <img src="${product.icon}" alt="${product.tenSanPham}" loading="lazy">
    <p><strong>Mã sản phẩm:</strong> ${product.stt}</p>
    <p><strong>Quy cách:</strong> ${product.quyCache || 'N/A'}</p>
    <p><strong>ĐVT:</strong> ${product.dvt}</p>
    <p><strong>Giá gốc:</strong> ${product.giaGoc || 'Liên hệ'}</p>
    <p><strong>Chiết khấu:</strong> ${product.chietKhau || 'N/A'}</p>
    <p><strong>Giá sau CK:</strong> ${product.giaSauCK || 'Liên hệ'}</p>
    <p><strong>Khuyến mãi thêm:</strong> ${product.khuyenMai || 'N/A'}</p>
    <p><strong>Giá Hỏa Giá (Giá cuối):</strong> ${product.giaHoaGia || product.giaSauCK || 'Liên hệ'}</p>
    ${product.hetHang ? '<p style="color:red; font-weight:bold;">HẾT HÀNG</p>' : '<p style="color:green; font-weight:bold;">CÒN HÀNG</p>'}
    <button class="btn add-to-cart-modal" data-id="${product.stt}" ${product.hetHang ? 'disabled' : ''}>Thêm vào giỏ</button>
  `;
  productModal.style.display = 'block';
  // Ensure the button inside the modal also uses the addToCart logic
  modalContent.querySelector('.add-to-cart-modal').addEventListener('click', addToCart);
}

applyFilters.addEventListener('click', () => {
  fetchProducts(searchInput.value, hideOutOfStock.checked, categorySelect.value);
});

toggleCart.addEventListener('click', () => {
  cartSidebar.classList.toggle('open');
  if (cartSidebar.classList.contains('open')) {
    renderCart();
  }
});

clearCart.addEventListener('click', () => {
  if (confirm('Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng không?')) {
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    showToast('Giỏ hàng đã được xóa', 'info');
  }
});

closeModal.addEventListener('click', () => {
  productModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === productModal) {
    productModal.style.display = 'none';
  }
});

productList.addEventListener('click', async (e) => {
  const card = e.target.closest('.product-card');
  // Check if the click is on the card itself, but not on an interactive element within it
  if (card && card.dataset.productId && !e.target.closest('button')) {
    const id = parseInt(card.dataset.productId);
    try {
      loading.style.display = 'block';
      const response = await fetch(`/api/products/${id}`); //
      if (!response.ok) throw new Error('Không thể tải chi tiết sản phẩm.');
      const product = await response.json();
      showProductModal(product);
    } catch (error) {
      console.error("Lỗi khi hiển thị modal:", error);
      showToast(error.message, 'error');
    } finally {
      loading.style.display = 'none';
    }
  }
});

// Initial load
fetchProducts();
renderCart(); // Render cart from localStorage on initial load
