// Tamaños de pizza con precios
// Definir tamaños con número de piezas
const sizeOptions = {
    individual: { label: "Individual (4 pz)", pieces: 4 },
    chica: { label: "Chica (6 pz)", pieces: 6 },
    mediana: { label: "Mediana (8 pz)", pieces: 8 },
    grande: { label: "Grande (12 pz)", pieces: 12 },
    familiar: { label: "Familiar (16 pz)", pieces: 16 }
};

// Menú de pizzas con precios base (precio para tamaño mediano - 8 piezas)
const pizzaMenu = [
    { id: 1, name: "Margherita Clásica", category: "clasica", emoji: "🍕", price: 180, ingredients: "Salsa de tomate, mozzarella fresca, albahaca, aceite de oliva" },
    { id: 2, name: "Pepperoni Supreme", category: "clasica", emoji: "🍕", price: 220, ingredients: "Salsa de tomate, mozzarella, pepperoni extra, orégano" },
    { id: 3, name: "Cuatro Quesos", category: "premium", emoji: "🧀", price: 280, ingredients: "Salsa blanca, mozzarella, parmesano, gorgonzola, queso cabra" },
    { id: 4, name: "Hawaiana Tropical", category: "clasica", emoji: "🍍", price: 240, ingredients: "Salsa de tomate, mozzarella, jamón, piña natural" },
    { id: 5, name: "Vegetariana Garden", category: "veggie", emoji: "🥬", price: 200, ingredients: "Salsa de tomate, mozzarella, pimientos, champiñones, cebolla, aceitunas" },
    { id: 6, name: "Meat Lovers", category: "premium", emoji: "🥩", price: 320, ingredients: "Salsa BBQ, mozzarella, pepperoni, salchicha, jamón, tocino" },
    { id: 7, name: "Mediterránea", category: "premium", emoji: "🫒", price: 300, ingredients: "Salsa pesto, mozzarella, tomates cherry, aceitunas, rúcula, queso feta" },
    { id: 8, name: "Vegana Delight", category: "veggie", emoji: "🌱", price: 250, ingredients: "Salsa de tomate, queso vegano, vegetales asados, espinacas" }
];

// Variables globales
let cart = [];
let currentFilter = 'all';

// Elementos DOM
const menuGrid = document.getElementById('menuGrid');
const filterBtns = document.querySelectorAll('.filter-btn');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const orderBtn = document.getElementById('orderBtn');
const orderModal = document.getElementById('orderModal');
const statusText = document.getElementById('statusText');
const deliveryTime = document.getElementById('deliveryTime');
const paymentModal = document.getElementById('paymentModal');
const closePayment = document.getElementById('closePayment');
const paymentForm = document.getElementById('paymentForm');
const paymentMethod = document.getElementById('paymentMethod');
const cardFields = document.getElementById('cardFields');


// INICIALIZACIÓN

document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    console.log("🍕 Pizza Deprizza Iniciada");
    renderMenu();
    setupEventListeners();
    updateDeliveryStatus();
    setInterval(updateDeliveryStatus, 30000);
}

// EVENT LISTENERS
function setupEventListeners() {
    // Filtros
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderMenu(currentFilter);
        });
    });

    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (e) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// RENDERIZAR MENÚ
function renderMenu(filter = 'all') {
    menuGrid.innerHTML = '';

    const pizzas = filter === 'all' ? pizzaMenu : pizzaMenu.filter(p => p.category === filter);

    pizzas.forEach(pizza => {
        const card = document.createElement('div');
        card.className = 'pizza-card';
        card.innerHTML = `
            <div class="pizza-image">${pizza.emoji}</div>
            <div class="pizza-content">
                <h3 class="pizza-title">${pizza.name}</h3>
                <span class="pizza-category">${pizza.category}</span>
                <p class="pizza-ingredients">${pizza.ingredients}</p>
                <div class="pizza-info">
                    <span class="pizza-price">Desde $${(pizza.price * 4 / 8).toFixed(0)}</span>
                    <span class="pizza-time">⏱️ 15-25 min</span>
                </div>
                <button class="size-select-btn" onclick="chooseSize(${pizza.id}, '${pizza.name}')">
                    <span class="btn-icon">📏</span>
                    <span class="btn-text">Elegir Tamaño</span>
                    <span class="btn-arrow">→</span>
                </button>
            </div>
        `;
        menuGrid.appendChild(card);
    });
}

// SELECCIÓN DE TAMAÑO (MODAL)
let currentPizza = null;

function chooseSize(pizzaId, pizzaName) {
    const pizza = pizzaMenu.find(p => p.id === pizzaId);
    if (!pizza) return;

    const basePrice = pizza.price; // precio para tamaño mediano (8 pz)

    document.getElementById("selectedPizzaName").textContent = pizzaName;
    const sizeOptionsDiv = document.getElementById("sizeOptions");
    sizeOptionsDiv.innerHTML = "";

    Object.entries(sizeOptions).forEach(([key, value]) => {
        // Regla de 3 proporcional al número de piezas
        const price = Math.round(basePrice * value.pieces / 8);
        
        const btn = document.createElement("button");
        btn.className = "size-option-btn";
        btn.innerHTML = `
            <div class="size-info">
                <span class="size-name">${value.label}</span>
                <span class="size-price">$${price}</span>
            </div>
            <div class="size-detail">
                <span class="price-per-slice">$${(price / value.pieces).toFixed(1)} por rebanada</span>
            </div>
        `;
        btn.onclick = () => {
            addToCart(pizzaId, pizzaName, key, price, value.label);
            document.getElementById("sizeModal").style.display = "none";
        };
        sizeOptionsDiv.appendChild(btn);
    });

    document.getElementById("sizeModal").style.display = "block";
}

// Cerrar modal de tamaño
document.getElementById("closeSize").onclick = function() {
    document.getElementById("sizeModal").style.display = "none";
};

// CARRITO
function addToCart(pizzaId, pizzaName, size, price, sizeLabel) {
    const existing = cart.find(item => item.id === pizzaId && item.size === size);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ 
            id: pizzaId, 
            name: pizzaName, 
            size, 
            price, 
            quantity: 1, 
            sizeLabel 
        });
    }
    updateCartDisplay();
}

function updateCartDisplay() {
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Tu carrito está vacío</p>';
        cartTotal.textContent = "0.00";
        orderBtn.disabled = true;
        return;
    }

    cartItems.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <strong>${item.name}</strong><br>
                <small>${item.sizeLabel} x${item.quantity}</small>
            </div>
            <div class="cart-item-controls">
                <span class="item-price">$${itemTotal.toFixed(2)}</span>
                <button class="remove-btn" onclick="removeFromCart(${item.id}, '${item.size}')">✕</button>
            </div>
        `;
        cartItems.appendChild(div);
    });

    cartTotal.textContent = total.toFixed(2);
    orderBtn.disabled = false;
}

function removeFromCart(id, size) {
    cart = cart.filter(item => !(item.id === id && item.size === size));
    updateCartDisplay();
}

// PAGO Y TICKET
orderBtn.addEventListener('click', () => {
    if (cart.length > 0) paymentModal.style.display = 'block';
});

closePayment.addEventListener('click', () => paymentModal.style.display = 'none');

paymentMethod.addEventListener('change', function() {
    cardFields.style.display = this.value === "tarjeta" ? "block" : "none";
});

paymentForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('customerName').value;
    const method = paymentMethod.value;

    generateTicket(name, method);
    await sendOrderToBackend(name, method);

    paymentModal.style.display = 'none';
    cart = [];
    updateCartDisplay();
    alert("✅ Pedido confirmado. Ticket generado.");
});

// TICKET EN TXT
function generateTicket(customerName, method) {
    const date = new Date().toLocaleString();
    let ticket = `🍕 Pizza Deprizza - Ticket\n\nFecha: ${date}\nCliente: ${customerName}\nMétodo de pago: ${method}\n\n--- Pedido ---\n`;
    cart.forEach(item => {
        ticket += `${item.name} - ${item.sizeLabel} x${item.quantity}  $${(item.price * item.quantity).toFixed(2)}\n`;
    });
    ticket += `\nTOTAL: $${cart.reduce((t, i) => t + i.price * i.quantity, 0).toFixed(2)}\n\n¡Gracias por tu compra!`;

    const blob = new Blob([ticket], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ticket.txt";
    link.click();
}

// ENVÍO AL BACKEND
async function sendOrderToBackend(name, method) {
    const orderData = {
        items: cart,
        total: parseFloat(cartTotal.textContent),
        customer: name,
        payment: method,
        timestamp: new Date().toISOString()
    };

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        });
        const data = await res.json();
        console.log("Orden creada:", data);
    } catch (err) {
        console.error("Error al enviar orden:", err);
    }
}

// STATUS DE ENTREGA
function updateDeliveryStatus() {
    fetch('/api/orders/status')
        .then(res => res.json())
        .then(data => {
            statusText.textContent = data.status;
            deliveryTime.textContent = `Tiempo estimado: ${data.averageWaitTime}-${data.averageWaitTime + 10} min`;
        })
        .catch(() => {
            statusText.textContent = "Modo offline";
            deliveryTime.textContent = "25-35 min";
        });
}