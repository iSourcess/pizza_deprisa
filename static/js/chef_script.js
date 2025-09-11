// CONFIGURACIÓN GLOBAL
let orders = [];
let selectedOrder = null;
let currentFilter = 'all';
let currentSort = 'time';
let chefName = 'Chef Mario';
let lastUpdateTime = Date.now();

// Elementos DOM
const ordersGrid = document.getElementById('ordersGrid');
const orderActions = document.getElementById('orderActions');
const notifications = document.getElementById('notifications');
const modal = document.getElementById('orderModal');
const closeModal = document.getElementById('closeModal');

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', function() {
    console.log('Panel de Chef iniciado');
    initializeChefPanel();
    setupEventListeners();
    startRealTimeUpdates();
});

function initializeChefPanel() {
    // Cargar nombre del chef desde localStorage o usar default
    const savedChefName = localStorage.getItem('chefName');
    if (savedChefName) {
        chefName = savedChefName;
        const chefNameElement = document.getElementById('chefName');
        if (chefNameElement) {
            chefNameElement.textContent = chefName;
        }
    }
    
    // Cargar órdenes iniciales
    loadOrders();
    
    // Configurar actualización de estadísticas
    setInterval(updateStatistics, 5000);
}

function setupEventListeners() {
    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderOrders();
        });
    });
    
    // Ordenamiento
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSort = this.dataset.sort;
            renderOrders();
        });
    });
    
    // Cerrar modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Teclas de acceso rápido
    document.addEventListener('keydown', function(e) {
        if (selectedOrder) {
            switch(e.key) {
                case '1':
                    updateOrderStatus('preparing');
                    break;
                case '2':
                    updateOrderStatus('cooking');
                    break;
                case '3':
                    updateOrderStatus('ready');
                    break;
                case 'Escape':
                    deselectOrder();
                    break;
            }
        }
    });
}

// CARGA DE DATOS
async function loadOrders() {
    try {
        console.log('Cargando órdenes...');
        // Asegurarse de que la URL sea correcta y completa
        const apiUrl = window.location.origin + '/api/admin/orders';
        console.log('Conectando a:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            // Asegurar que no se use caché
            cache: 'no-cache'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Datos recibidos del servidor:', data);
            
            // Procesar las órdenes
            let processedOrders = [];
            
            if (data.orders && Array.isArray(data.orders)) {
                processedOrders = data.orders.filter(order => 
                    order.status !== 'completed' && 
                    order.status !== 'delivered'
                );
            }
            
            // Agregar información de progreso y prioridad
            processedOrders.forEach(order => {
                order.progress = calculateProgress(order);
                order.priority = calculatePriority(order);
                
                // Asegurar que tengamos el nombre del cliente
                if (!order.customer) {
                    order.customer = order.customer_name || 'Cliente';
                }
                
                // Asegurar que tengamos el método de pago
                if (!order.payment) {
                    order.payment = order.payment_method || 'efectivo';
                }
                
                // Asegurar que items sea array
                if (!Array.isArray(order.items)) {
                    try {
                        order.items = JSON.parse(order.items || '[]');
                    } catch (e) {
                        order.items = [];
                    }
                }
            });
            
            orders = processedOrders;
            console.log(`Órdenes procesadas: ${orders.length}`);
            
            renderOrders();
            updateStatistics();
            
            if (orders.length > 0) {
                showNotification(`${orders.length} órdenes activas cargadas`, 'success');
            }
            
        } else {
            console.error('Error response:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error details:', errorText);
            showNotification('Error al cargar órdenes del servidor', 'error');
            loadMockData();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Error de conexión - usando datos de prueba', 'warning');
        loadMockData();
    }
}

function loadMockData() {
    console.log('Cargando datos de ejemplo...');
    orders = [
        {
            id: 1,
            items: [
                { name: 'Margherita Clásica', size: 'mediana', quantity: 2, price: 180 },
                { name: 'Pepperoni Supreme', size: 'grande', quantity: 1, price: 280 }
            ],
            total: 640,
            estimated_time: 25,
            customer: 'Juan Pérez',
            payment: 'tarjeta',
            status: 'received',
            created_at: new Date(Date.now() - 300000).toISOString(),
            progress: 10,
            priority: 'high'
        },
        {
            id: 2,
            items: [
                { name: 'Vegetariana Garden', size: 'familiar', quantity: 1, price: 320 }
            ],
            total: 320,
            estimated_time: 20,
            customer: 'María García',
            payment: 'efectivo',
            status: 'preparing',
            created_at: new Date(Date.now() - 600000).toISOString(),
            progress: 35,
            priority: 'medium'
        }
    ];
    renderOrders();
    updateStatistics();
}

// RENDERIZADO - MEJORADO
function renderOrders() {
    if (!ordersGrid) {
        console.error('Element ordersGrid not found');
        return;
    }
    
    // Verificar que orders sea un array
    if (!Array.isArray(orders)) {
        console.error('Orders is not an array:', orders);
        orders = [];
    }
    
    const filteredOrders = filterOrders(orders);
    const sortedOrders = sortOrders(filteredOrders);
    
    console.log(`Renderizando ${sortedOrders.length} órdenes`);
    
    if (sortedOrders.length === 0) {
        ordersGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🍕</div>
                <h3>No hay órdenes ${currentFilter === 'all' ? '' : 'en este estado'}</h3>
                <p>Las órdenes aparecerán aquí automáticamente</p>
                <button onclick="loadOrders()" class="refresh-btn" style="margin-top: 15px; padding: 10px 20px; background: #fd79a8; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    🔄 Actualizar Órdenes
                </button>
            </div>
        `;
        return;
    }
    
    ordersGrid.innerHTML = sortedOrders.map(order => createOrderCard(order)).join('');
    
    // Agregar event listeners a las tarjetas
    document.querySelectorAll('.order-card').forEach(card => {
        card.addEventListener('click', () => selectOrder(parseInt(card.dataset.orderId)));
    });
}

function createOrderCard(order) {
    // Validar que order tenga los datos necesarios
    if (!order || !order.id) {
        console.warn('Orden inválida:', order);
        return '';
    }
    
    const timeElapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
    const statusClass = `status-${order.status}`;
    const items = Array.isArray(order.items) ? order.items : [];
    
    return `
        <div class="order-card ${order.status} ${selectedOrder?.id === order.id ? 'selected' : ''}" 
             data-order-id="${order.id}">
            <div class="order-header">
                <div>
                    <div class="order-id">Orden #${order.id}</div>
                    <span class="order-status ${statusClass}">${getStatusText(order.status)}</span>
                </div>
                <div class="order-time">
                    <div>Hace ${timeElapsed} min</div>
                    <div class="estimated-time">Est: ${order.estimated_time || 25} min</div>
                </div>
            </div>
            
            <div class="customer-info">
                <div class="customer-name">${order.customer || 'Cliente'}</div>
                <div class="payment-method">Pago: ${order.payment || 'efectivo'}</div>
            </div>
            
            <div class="order-items">
                ${items.map(item => `
                    <div class="order-item">
                        <div class="item-info">
                            <div class="item-name">${item.name || 'Item'}</div>
                            <div class="item-details">${item.size || item.sizeLabel || ''}</div>
                        </div>
                        <div class="item-quantity">${item.quantity || 1}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${order.progress || 0}%"></div>
            </div>
            
            <div class="order-footer">
                <div class="order-total">$${order.total || 0}</div>
                <div class="priority-badge priority-${order.priority || 'medium'}">${getPriorityText(order.priority || 'medium')}</div>
            </div>
        </div>
    `;
}

// FUNCIONES DE FILTRADO Y ORDENAMIENTO
function filterOrders(orders) {
    if (currentFilter === 'all') {
        return orders;
    }
    return orders.filter(order => order.status === currentFilter);
}

function sortOrders(orders) {
    const sortedOrders = [...orders];
    
    switch (currentSort) {
        case 'time':
            return sortedOrders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        case 'estimated':
            return sortedOrders.sort((a, b) => (a.estimated_time || 25) - (b.estimated_time || 25));
        case 'priority':
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            return sortedOrders.sort((a, b) => priorityWeight[b.priority || 'medium'] - priorityWeight[a.priority || 'medium']);
        default:
            return sortedOrders;
    }
}

// GESTIÓN DE ÓRDENES - MEJORADO
function selectOrder(orderId) {
    selectedOrder = orders.find(order => order.id === orderId);
    
    if (selectedOrder) {
        // Mostrar botones de acción
        if (orderActions) {
            orderActions.classList.add('show');
        }
        
        // Actualizar visualización
        renderOrders();
        
        // Mostrar modal con detalles
        showOrderDetails(selectedOrder);
        
        showNotification(`Orden #${orderId} seleccionada`, 'success');
    }
}

function deselectOrder() {
    selectedOrder = null;
    if (orderActions) {
        orderActions.classList.remove('show');
    }
    if (modal) {
        modal.style.display = 'none';
    }
    renderOrders();
}

async function updateOrderStatus(newStatus) {
    if (!selectedOrder) {
        showNotification('No hay orden seleccionada', 'warning');
        return;
    }
    
    const orderId = selectedOrder.id;
    const previousStatus = selectedOrder.status;
    
    try {
        // Asegurarse de que la URL sea correcta y completa
        const apiUrl = window.location.origin + `/api/orders/${orderId}/status`;
        console.log('Actualizando estado de orden:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            cache: 'no-cache',
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            // Actualizar localmente
            selectedOrder.status = newStatus;
            selectedOrder.progress = calculateProgress(selectedOrder);
            
            // Actualizar en el array principal
            const orderIndex = orders.findIndex(order => order.id === orderId);
            if (orderIndex !== -1) {
                orders[orderIndex] = selectedOrder;
            }
            
            // Re-renderizar
            renderOrders();
            updateStatistics();
            
            showNotification(
                `Orden #${orderId} actualizada a ${getStatusText(newStatus)}`, 
                'success'
            );
            
            // Deseleccionar si está lista
            if (newStatus === 'ready') {
                setTimeout(() => {
                    deselectOrder();
                }, 2000);
            }
            
        } else {
            throw new Error('Error en la respuesta del servidor');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        
        // Intentar actualización local como fallback
        selectedOrder.status = newStatus;
        selectedOrder.progress = calculateProgress(selectedOrder);
        
        const orderIndex = orders.findIndex(order => order.id === orderId);
        if (orderIndex !== -1) {
            orders[orderIndex] = selectedOrder;
        }
        
        renderOrders();
        updateStatistics();
        
        showNotification(
            `Orden #${orderId} actualizada localmente (sin conexión al servidor)`, 
            'warning'
        );
    }
}

// MODAL Y DETALLES
function showOrderDetails(order) {
    const orderDetails = document.getElementById('orderDetails');
    if (!orderDetails) return;
    
    const timeElapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
    const items = Array.isArray(order.items) ? order.items : [];
    
    orderDetails.innerHTML = `
        <h2>Detalles de Orden #${order.id}</h2>
        
        <div class="modal-section">
            <h3>Información General</h3>
            <p><strong>Cliente:</strong> ${order.customer}</p>
            <p><strong>Estado:</strong> <span class="status-${order.status}">${getStatusText(order.status)}</span></p>
            <p><strong>Tiempo transcurrido:</strong> ${timeElapsed} minutos</p>
            <p><strong>Tiempo estimado:</strong> ${order.estimated_time || 25} minutos</p>
            <p><strong>Prioridad:</strong> <span class="priority-${order.priority}">${getPriorityText(order.priority)}</span></p>
            <p><strong>Método de pago:</strong> ${order.payment}</p>
        </div>
        
        <div class="modal-section">
            <h3>Artículos del Pedido</h3>
            ${items.map(item => `
                <div class="modal-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                    <div class="item-info">
                        <strong>${item.name || 'Item'}</strong>
                        ${item.size || item.sizeLabel ? `<br><small>Tamaño: ${item.size || item.sizeLabel}</small>` : ''}
                    </div>
                    <div class="item-quantity" style="margin: 0 10px;">Cantidad: ${item.quantity || 1}</div>
                    <div class="item-price" style="font-weight: bold;">$${item.price || 0}</div>
                </div>
            `).join('')}
        </div>
        
        <div class="modal-section">
            <h3>Progreso</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${order.progress}%"></div>
            </div>
            <p>Completado: ${order.progress}%</p>
        </div>
        
        <div class="modal-footer" style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd;">
            <h3>Total: $${order.total}</h3>
        </div>
        
        <div class="modal-actions" style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="action-btn btn-preparing" onclick="updateOrderStatus('preparing')" style="flex: 1; min-width: 150px;">
                🔄 Marcar Preparando
            </button>
            <button class="action-btn btn-cooking" onclick="updateOrderStatus('cooking')" style="flex: 1; min-width: 150px;">
                🔥 Enviar a Horno
            </button>
            <button class="action-btn btn-ready" onclick="updateOrderStatus('ready')" style="flex: 1; min-width: 150px;">
                ✅ Marcar Lista
            </button>
        </div>
    `;
    
    if (modal) {
        modal.style.display = 'block';
    }
}

// ESTADÍSTICAS - MEJORADO
function updateStatistics() {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => order.status === 'received').length;
    const cookingOrders = orders.filter(order => order.status === 'preparing' || order.status === 'cooking').length;
    const readyOrders = orders.filter(order => order.status === 'ready').length;
    
    // Calcular tiempo promedio
    const avgTime = calculateAverageTime();
    
    // Actualizar DOM con verificación de elementos
    const totalElement = document.getElementById('totalOrders');
    const pendingElement = document.getElementById('pendingOrders');
    const cookingElement = document.getElementById('cookingOrders');
    const readyElement = document.getElementById('readyOrders');
    const avgTimeElement = document.getElementById('avgTime');
    
    if (totalElement) totalElement.textContent = totalOrders;
    if (pendingElement) pendingElement.textContent = pendingOrders;
    if (cookingElement) cookingElement.textContent = cookingOrders;
    if (readyElement) readyElement.textContent = readyOrders;
    if (avgTimeElement) avgTimeElement.textContent = Math.round(avgTime);
}

function calculateAverageTime() {
    if (orders.length === 0) return 0;
    
    const completedOrders = orders.filter(order => order.status !== 'received');
    if (completedOrders.length === 0) return 0;
    
    const totalTime = completedOrders.reduce((sum, order) => {
        const elapsed = (Date.now() - new Date(order.created_at).getTime()) / 60000;
        return sum + elapsed;
    }, 0);
    
    return totalTime / completedOrders.length;
}

// UTILIDADES
function calculateProgress(order) {
    const statusProgress = {
        'received': 10,
        'preparing': 35,
        'cooking': 70,
        'ready': 100,
        'completed': 100,
        'delivered': 100
    };
    
    return statusProgress[order.status] || 0;
}

function calculatePriority(order) {
    const currentTime = Date.now();
    const orderTime = new Date(order.created_at).getTime();
    const elapsedMinutes = (currentTime - orderTime) / 60000;
    const estimatedTime = order.estimated_time || 25;
    
    // Prioridad basada en tiempo transcurrido vs estimado
    if (elapsedMinutes > estimatedTime) {
        return 'high';
    } else if (elapsedMinutes > estimatedTime * 0.7) {
        return 'medium';
    } else {
        return 'low';
    }
}

function getStatusText(status) {
    const statusTexts = {
        'received': 'Recibida',
        'preparing': 'Preparando',
        'cooking': 'En Horno',
        'ready': 'Lista',
        'completed': 'Completada',
        'delivered': 'Entregada'
    };
    
    return statusTexts[status] || status;
}

function getPriorityText(priority) {
    const priorityTexts = {
        'high': 'Alta',
        'medium': 'Media',
        'low': 'Baja'
    };
    
    return priorityTexts[priority] || priority;
}

// NOTIFICACIONES
function showNotification(message, type = 'info') {
    if (!notifications) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer; color: inherit; margin-left: 10px;">&times;</button>
        </div>
    `;
    
    notifications.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// ACTUALIZACIONES EN TIEMPO REAL
function startRealTimeUpdates() {
    // Cargar órdenes inmediatamente al iniciar
    setTimeout(() => {
        loadOrders();
    }, 500);
    
    // Actualizar órdenes cada 10 segundos
    setInterval(() => {
        const now = Date.now();
        // Solo actualizar si han pasado al menos 5 segundos desde la última actualización
        if (now - lastUpdateTime > 5000) {
            console.log('Actualizando órdenes automáticamente...');
            loadOrders();
            lastUpdateTime = now;
        }
    }, 10000);
    
    // Actualizar tiempos cada minuto
    setInterval(() => {
        if (orders.length > 0) {
            console.log('Actualizando progreso y prioridades...');
            // Recalcular progreso y prioridades
            orders.forEach(order => {
                order.progress = calculateProgress(order);
                order.priority = calculatePriority(order);
            });
            renderOrders();
            updateStatistics();
        }
    }, 60000);
    
    console.log('Actualizaciones en tiempo real iniciadas');
}

// TESTING Y DEBUG
function simulateNewOrder() {
    const newOrder = {
        id: Date.now(),
        items: [
            { name: 'Pizza Hawaiana', size: 'grande', quantity: 1, price: 250 }
        ],
        total: 250,
        estimated_time: 25,
        customer: 'Cliente Nuevo',
        payment: 'tarjeta',
        status: 'received',
        created_at: new Date().toISOString(),
        progress: 10,
        priority: 'medium'
    };
    
    orders.unshift(newOrder);
    renderOrders();
    updateStatistics();
    showNotification(`Nueva orden #${newOrder.id} recibida`, 'success');
}

// Solo para desarrollo - agregar función de test
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Agregar botón de test después de cargar la página
    setTimeout(() => {
        const testButton = document.createElement('button');
        testButton.textContent = 'Test: Agregar Orden';
        testButton.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 9999; padding: 10px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;';
        testButton.onclick = simulateNewOrder;
        document.body.appendChild(testButton);
    }, 2000);
}

// FUNCIONES GLOBALES PARA TESTING
window.chefPanel = {
    orders,
    selectOrder,
    updateOrderStatus,
    calculateProgress,
    calculatePriority,
    getStatusText,
    getPriorityText,
    simulateNewOrder,
    loadOrders
};