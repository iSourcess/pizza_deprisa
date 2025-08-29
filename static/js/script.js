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
let currentDoubleIngredient = null;
let customPizza = {
    size: { value: 'mediana', pieces: 8, price: 180 },
    dough: { value: 'tradicional', price: 0 },
    sauce: { value: 'tomate', price: 0 },
    cheese: { value: 'mozzarella', price: 0 },
    ingredients: {}
};

// Lista de ingredientes disponibles
const availableIngredients = [
    { name: 'Pepperoni', price: 25, className: 'pepperoni' },
    { name: 'Champiñones', price: 20, className: 'champiñones' },
    { name: 'Pimientos', price: 15, className: 'pimientos' },
    { name: 'Cebolla', price: 10, className: 'cebolla' },
    { name: 'Jamón', price: 30, className: 'jamón' },
    { name: 'Piña', price: 15, className: 'piña' },
    { name: 'Aceitunas', price: 20, className: 'aceitunas' },
    { name: 'Tocino', price: 35, className: 'tocino' },
    { name: 'Salchicha', price: 30, className: 'salchicha' }
];

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

    // Cerrar modal de doble porción
    document.getElementById('closeDouble').addEventListener('click', () => {
        document.getElementById('doubleModal').style.display = 'none';
        currentDoubleIngredient = null;
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
                <div class="pizza-actions">
                    <button class="size-select-btn" onclick="chooseSize(${pizza.id}, '${pizza.name}')">
                        <span class="btn-icon">📏</span>
                        <span class="btn-text">Elegir Tamaño</span>
                        <span class="btn-arrow">→</span>
                    </button>
                    <button class="size-select-btn double-btn" onclick="chooseDoubleIngredient(${pizza.id}, '${pizza.name}')">
                        <span class="btn-icon">➕</span>
                        <span class="btn-text">Doble</span>
                    </button>
                </div>
            </div>
        `;
        menuGrid.appendChild(card);
    });
}


// SELECCIÓN DE TAMAÑO (MODAL)
let currentPizza = null;

function chooseSize(pizzaId, pizzaName, doubleIngredient = null) {
    const pizza = pizzaMenu.find(p => p.id === pizzaId);
    if (!pizza) return;

    const basePrice = pizza.price; // precio para tamaño mediano (8 pz)

    document.getElementById("selectedPizzaName").textContent = pizzaName + (doubleIngredient ? ` (Doble ${doubleIngredient})` : '');
    const sizeOptionsDiv = document.getElementById("sizeOptions");
    sizeOptionsDiv.innerHTML = "";

    Object.entries(sizeOptions).forEach(([key, value]) => {
        // Regla de 3 proporcional al número de piezas
        let price = Math.round(basePrice * value.pieces / 8);
        
        // Agregar costo de doble porción si aplica
        if (doubleIngredient) {
            price += 30;
        }
        
        const btn = document.createElement("button");
        btn.className = "size-option-btn";
        btn.innerHTML = `
            <div class="size-info">
                <span class="size-name">${value.label}</span>
                <span class="size-price">$${price}</span>
            </div>
            <div class="size-detail">
                <span class="price-per-slice">$${(price / value.pieces).toFixed(1)} por rebanada</span>
                ${doubleIngredient ? '<span style="color: #fd79a8; font-weight: bold;">+ Doble ' + doubleIngredient + '</span>' : ''}
            </div>
        `;
        btn.onclick = () => {
            addToCart(pizzaId, pizzaName, key, price, value.label, doubleIngredient);
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
function addToCart(pizzaId, pizzaName, size, price, sizeLabel, doubleIngredient = null) {
    const cartId = doubleIngredient ? `${pizzaId}_${size}_double_${doubleIngredient}` : `${pizzaId}_${size}`;
    const displayName = pizzaName + (doubleIngredient ? ` (Doble ${doubleIngredient})` : '');
    
    const existing = cart.find(item => item.cartId === cartId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ 
            cartId: cartId,
            id: pizzaId, 
            name: displayName, 
            size, 
            price, 
            quantity: 1, 
            sizeLabel,
            doubleIngredient: doubleIngredient
        });
    }
    updateCartDisplay();
    
    // Limpiar variables
    currentDoubleIngredient = null;
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
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const div = document.createElement('div');
        div.className = 'cart-item';
        
        let itemDescription = `<strong>${item.name}</strong><br><small>${item.sizeLabel} x${item.quantity}</small>`;
        
        // Agregar descripción si es pizza personalizada
        if (item.description) {
            itemDescription += `<br><small style="color: #636e72;">${item.description}</small>`;
        }
        
        div.innerHTML = `
            <div class="cart-item-info">
                ${itemDescription}
            </div>
            <div class="cart-item-controls">
                <span class="item-price">$${itemTotal.toFixed(2)}</span>
                <button class="remove-btn" onclick="removeFromCart(${index})">✕</button>
            </div>
        `;
        cartItems.appendChild(div);
    });

    cartTotal.textContent = total.toFixed(2);
    orderBtn.disabled = false;
}

function removeFromCart(index) {
    cart.splice(index, 1);
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

// Funciones del personalizador
function showCustomizer() {
    document.getElementById('pizzaCustomizer').style.display = 'block';
    initializeCustomizer();
}

function hideCustomizer() {
    document.getElementById('pizzaCustomizer').style.display = 'none';
}

function initializeCustomizer() {
    setupCustomizerEvents();
    renderIngredientOptions();
    updatePizzaPreview();
}

function setupCustomizerEvents() {
    // Event listeners para opciones básicas
    document.querySelectorAll('.option-item').forEach(item => {
        item.addEventListener('click', function() {
            const type = this.dataset.type;
            const group = this.parentElement;
            
            // Remover selección anterior
            group.querySelectorAll('.option-item').forEach(opt => opt.classList.remove('selected'));
            
            // Agregar nueva selección
            this.classList.add('selected');
            
            // Actualizar configuración
            updateCustomConfiguration(type, this);
            updatePizzaPreview();
        });
    });
}

function updateCustomConfiguration(type, element) {
    const value = element.dataset.value;
    const price = parseInt(element.dataset.price) || 0;
    
    if (type === 'size') {
        customPizza.size = {
            value: value,
            pieces: parseInt(element.dataset.pieces),
            price: [120, 150, 180, 240, 300][['individual', 'chica', 'mediana', 'grande', 'familiar'].indexOf(value)]
        };
    } else {
        customPizza[type] = { value: value, price: price };
    }
}

function renderIngredientOptions() {
    const container = document.getElementById('ingredientOptions');
    container.innerHTML = '';
    
    availableIngredients.forEach(ingredient => {
        const div = document.createElement('div');
        div.className = 'ingredient-option';
        div.innerHTML = `
            <div>
                <strong>${ingredient.name}</strong>
                <div style="font-size: 0.9em; color: #636e72;">+$${ingredient.price}</div>
            </div>
            <div class="ingredient-controls">
                <button class="half-btn" data-half="left" onclick="toggleHalf('${ingredient.name}', 'left')">1/2 Izq</button>
                <button class="half-btn" data-half="right" onclick="toggleHalf('${ingredient.name}', 'right')">1/2 Der</button>
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="changeIngredientQuantity('${ingredient.name}', -1)">-</button>
                    <span id="qty-${ingredient.name}">0</span>
                    <button class="qty-btn" onclick="changeIngredientQuantity('${ingredient.name}', 1)">+</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function changeIngredientQuantity(name, change) {
    if (!customPizza.ingredients[name]) {
        customPizza.ingredients[name] = { quantity: 0, half: null };
    }
    
    customPizza.ingredients[name].quantity = Math.max(0, customPizza.ingredients[name].quantity + change);
    
    if (customPizza.ingredients[name].quantity === 0) {
        delete customPizza.ingredients[name];
    }
    
    document.getElementById(`qty-${name}`).textContent = customPizza.ingredients[name]?.quantity || 0;
    updatePizzaPreview();
}

function toggleHalf(name, side) {
    if (!customPizza.ingredients[name] || customPizza.ingredients[name].quantity === 0) {
        customPizza.ingredients[name] = { quantity: 1, half: side };
        document.getElementById(`qty-${name}`).textContent = 1;
    } else {
        customPizza.ingredients[name].half = customPizza.ingredients[name].half === side ? null : side;
    }
    
    // Actualizar UI de botones
    const leftBtn = document.querySelector(`[data-half="left"][onclick*="${name}"]`);
    const rightBtn = document.querySelector(`[data-half="right"][onclick*="${name}"]`);
    
    leftBtn.classList.toggle('active', customPizza.ingredients[name].half === 'left');
    rightBtn.classList.toggle('active', customPizza.ingredients[name].half === 'right');
    
    updatePizzaPreview();
}

function updatePizzaPreview() {
    // Actualizar colores base
    const sauceColors = {
        tomate: '#e63946',
        bbq: '#8b4513',
        pesto: '#228b22',
        blanca: '#f8f9fa'
    };
    
    const cheeseColors = {
        mozzarella: '#fff3cd',
        cheddar: '#ffd60a',
        parmesano: '#f4f3ee'
    };
    
    document.getElementById('pizzaSauce').style.background = sauceColors[customPizza.sauce.value];
    document.getElementById('pizzaCheese').style.background = cheeseColors[customPizza.cheese.value];
    
    // Limpiar ingredientes anteriores
    const ingredientsContainer = document.getElementById('pizzaIngredients');
    ingredientsContainer.innerHTML = '';
    
    // Agregar puntos de ingredientes
    Object.keys(customPizza.ingredients).forEach(name => {
        const ingredient = customPizza.ingredients[name];
        const ingredientData = availableIngredients.find(ing => ing.name === name);
        
        for (let i = 0; i < ingredient.quantity; i++) {
            const dot = document.createElement('div');
            dot.className = `ingredient-dot ingredient-${ingredientData.className}`;
            
            // Posicionar aleatoriamente o en mitades
            const angle = Math.random() * 2 * Math.PI;
            const radius = 30 + Math.random() * 60;
            
            if (ingredient.half === 'left') {
                dot.style.left = `${50 - Math.cos(angle) * radius/2}%`;
            } else if (ingredient.half === 'right') {
                dot.style.left = `${50 + Math.cos(angle) * radius/2}%`;
            } else {
                dot.style.left = `${50 + Math.cos(angle) * radius}%`;
            }
            
            dot.style.top = `${50 + Math.sin(angle) * radius}%`;
            ingredientsContainer.appendChild(dot);
        }
    });
    
    // Actualizar información
    const sizeLabels = {
        individual: 'Individual (4 piezas)',
        chica: 'Chica (6 piezas)',
        mediana: 'Mediana (8 piezas)',
        grande: 'Grande (12 piezas)',
        familiar: 'Familiar (16 piezas)'
    };
    
    document.getElementById('previewSize').textContent = sizeLabels[customPizza.size.value];
    
    // Calcular precio total
    let totalPrice = customPizza.size.price + customPizza.dough.price + customPizza.sauce.price + customPizza.cheese.price;
    
    Object.keys(customPizza.ingredients).forEach(name => {
        const ingredientData = availableIngredients.find(ing => ing.name === name);
        totalPrice += ingredientData.price * customPizza.ingredients[name].quantity;
    });
    
    document.getElementById('previewTotal').textContent = `$${totalPrice}`;
}

function addCustomPizza() {
    // Crear descripción de la pizza personalizada
    let description = `Masa ${customPizza.dough.value}, salsa ${customPizza.sauce.value}, queso ${customPizza.cheese.value}`;
    
    const ingredientNames = Object.keys(customPizza.ingredients).map(name => {
        const ingredient = customPizza.ingredients[name];
        let desc = name;
        if (ingredient.quantity > 1) desc += ` x${ingredient.quantity}`;
        if (ingredient.half) desc += ` (1/2 ${ingredient.half === 'left' ? 'izq' : 'der'})`;
        return desc;
    });
    
    if (ingredientNames.length > 0) {
        description += ', ' + ingredientNames.join(', ');
    }
    
    // Calcular precio
    let totalPrice = customPizza.size.price + customPizza.dough.price + customPizza.sauce.price + customPizza.cheese.price;
    Object.keys(customPizza.ingredients).forEach(name => {
        const ingredientData = availableIngredients.find(ing => ing.name === name);
        totalPrice += ingredientData.price * customPizza.ingredients[name].quantity;
    });
    
    // Agregar al carrito
    const sizeLabels = {
        individual: 'Individual (4 pz)',
        chica: 'Chica (6 pz)', 
        mediana: 'Mediana (8 pz)',
        grande: 'Grande (12 pz)',
        familiar: 'Familiar (16 pz)'
    };
    
    cart.push({
        id: 'custom_' + Date.now(),
        name: 'Pizza Personalizada',
        size: customPizza.size.value,
        price: totalPrice,
        quantity: 1,
        sizeLabel: sizeLabels[customPizza.size.value],
        description: description
    });
    
    updateCartDisplay();
    hideCustomizer();
    
    // Resetear configuración
    customPizza = {
        size: { value: 'mediana', pieces: 8, price: 180 },
        dough: { value: 'tradicional', price: 0 },
        sauce: { value: 'tomate', price: 0 },
        cheese: { value: 'mozzarella', price: 0 },
        ingredients: {}
    };
    
    alert('¡Pizza personalizada agregada al carrito!');
}

// Funciones para doble porción
function chooseDoubleIngredient(pizzaId, pizzaName) {
    const pizza = pizzaMenu.find(p => p.id === pizzaId);
    if (!pizza) return;
    
    // Extraer ingredientes de la descripción de la pizza
    const ingredients = extractIngredientsFromPizza(pizza.ingredients);
    
    document.getElementById("selectedPizzaNameDouble").textContent = pizzaName;
    const ingredientList = document.getElementById("doubleIngredientList");
    ingredientList.innerHTML = "";
    
    if (ingredients.length === 0) {
        ingredientList.innerHTML = '<p style="text-align: center; color: #636e72;">No hay ingredientes disponibles para doble porción</p>';
        document.getElementById("doubleModal").style.display = "block";
        return;
    }
    
    ingredients.forEach(ingredient => {
        const div = document.createElement("div");
        div.className = "ingredient-item";
        div.innerHTML = `
            <span class="ingredient-name">${ingredient}</span>
            <span class="ingredient-price">+$30</span>
        `;
        div.onclick = () => {
            // Remover selección anterior
            document.querySelectorAll('.ingredient-item').forEach(item => item.classList.remove('selected'));
            div.classList.add('selected');
            currentDoubleIngredient = ingredient;
        };
        ingredientList.appendChild(div);
    });
    
    // Agregar botón de confirmación
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "add-custom-btn";
    confirmBtn.textContent = "Confirmar y Elegir Tamaño";
    confirmBtn.style.marginTop = "20px";
    confirmBtn.onclick = () => {
        if (currentDoubleIngredient) {
            document.getElementById("doubleModal").style.display = "none";
            chooseSize(pizzaId, pizzaName, currentDoubleIngredient);
        } else {
            alert("Por favor selecciona un ingrediente");
        }
    };
    ingredientList.appendChild(confirmBtn);
    
    document.getElementById("doubleModal").style.display = "block";
}

function extractIngredientsFromPizza(ingredientsText) {
    // Lista de ingredientes que se pueden duplicar
    const possibleIngredients = [
        'pepperoni', 'jamón', 'tocino', 'salchicha', 'champiñones', 
        'pimientos', 'cebolla', 'aceitunas', 'piña', 'mozzarella',
        'parmesano', 'gorgonzola', 'queso cabra', 'queso feta'
    ];
    
    const found = [];
    const lowerText = ingredientsText.toLowerCase();
    
    possibleIngredients.forEach(ingredient => {
        if (lowerText.includes(ingredient)) {
            // Capitalizar primera letra
            found.push(ingredient.charAt(0).toUpperCase() + ingredient.slice(1));
        }
    });
    
    return found;
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