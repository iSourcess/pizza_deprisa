#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pizza Deprizza - Backend Server
Sistema de gestión de pedidos y menú
"""

import json
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os
import threading
import time
import atexit
import signal

# Configuración de la aplicación
app = Flask(__name__, static_folder='static', template_folder='.')
CORS(app)  # Habilitar CORS para requests desde el frontend

# Configuración de la base de datos
DB_NAME = 'pizza_deprizza.db'

class PizzaDePrizzaDB:
    """Manejador de base de datos para Pizza Deprizza"""
    
    def __init__(self, db_name):
        self.db_name = db_name
        self.connection_pool = []
        self.init_database()
    
    def get_connection(self):
        """Obtener conexión con manejo de errores mejorado"""
        try:
            # Verificar que el directorio existe
            db_dir = os.path.dirname(os.path.abspath(self.db_name))
            if not os.path.exists(db_dir):
                os.makedirs(db_dir)
            
            # Crear conexión con configuración mejorada
            conn = sqlite3.connect(
                self.db_name,
                timeout=20.0,  # Timeout de 20 segundos
                check_same_thread=False
            )
            
            # Configurar WAL mode para mejor concurrencia
            conn.execute('PRAGMA journal_mode=WAL;')
            conn.execute('PRAGMA synchronous=NORMAL;')
            conn.execute('PRAGMA cache_size=1000;')
            conn.execute('PRAGMA temp_store=memory;')
            
            return conn
        except sqlite3.Error as e:
            print(f"Error al conectar con la base de datos: {e}")
            raise
    
    def init_database(self):
        """Inicializar tablas de la base de datos con manejo de errores"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                conn = self.get_connection()
                cursor = conn.cursor()
                
                # Tabla de pizzas del menú
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS pizzas (
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL,
                        category TEXT NOT NULL,
                        emoji TEXT,
                        ingredients TEXT,
                        price REAL NOT NULL,
                        time_range TEXT,
                        available INTEGER DEFAULT 1
                    )
                ''')
                
                # Tabla de órdenes
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS orders (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        order_data TEXT NOT NULL,
                        total_price REAL NOT NULL,
                        estimated_time INTEGER,
                        customer_name TEXT,
                        payment_method TEXT,
                        status TEXT DEFAULT 'received',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        completed_at TIMESTAMP NULL
                    )
                ''')
                
                # Tabla de ingredientes
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS ingredients (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE NOT NULL,
                        stock INTEGER DEFAULT 100,
                        min_stock INTEGER DEFAULT 10,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Tabla de estado del restaurante
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS restaurant_status (
                        id INTEGER PRIMARY KEY,
                        current_orders INTEGER DEFAULT 0,
                        average_wait_time INTEGER DEFAULT 25,
                        status TEXT DEFAULT 'Operando normalmente',
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                conn.commit()
                conn.close()
                
                # Insertar datos iniciales si no existen
                self.populate_initial_data()
                print("Base de datos inicializada correctamente")
                return
                
            except sqlite3.Error as e:
                print(f"Intento {attempt + 1} falló: {e}")
                if attempt == max_retries - 1:
                    # Último intento fallido, intentar recuperar
                    self.recover_database()
                else:
                    time.sleep(1)  # Esperar antes del siguiente intento
    
    def recover_database(self):
        """Intentar recuperar base de datos corrupta"""
        try:
            print("Intentando recuperar base de datos...")
            
            # Hacer backup del archivo corrupto
            if os.path.exists(self.db_name):
                backup_name = f"{self.db_name}.backup_{int(time.time())}"
                os.rename(self.db_name, backup_name)
                print(f"Backup creado: {backup_name}")
            
            # Crear nueva base de datos
            conn = self.get_connection()
            conn.close()
            print("Nueva base de datos creada")
            
            # Reintentar inicialización
            self.init_database()
            
        except Exception as e:
            print(f"Error en recuperación de base de datos: {e}")
            raise
    
    def execute_with_retry(self, query, params=None, fetch=False):
        """Ejecutar query con reintentos automáticos"""
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                conn = self.get_connection()
                cursor = conn.cursor()
                
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                
                if fetch:
                    result = cursor.fetchall()
                    conn.close()
                    return result
                else:
                    result = cursor.lastrowid if cursor.lastrowid else cursor.rowcount
                    conn.commit()
                    conn.close()
                    return result
                    
            except sqlite3.Error as e:
                if conn:
                    conn.close()
                
                if "disk I/O error" in str(e):
                    print(f"Error de I/O en intento {attempt + 1}: {e}")
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)  # Backoff exponencial
                        continue
                
                print(f"Error en base de datos: {e}")
                raise
    
    def populate_initial_data(self):
        """Poblar la base de datos con datos iniciales"""
        try:
            # Verificar si ya hay datos de pizzas
            result = self.execute_with_retry("SELECT COUNT(*) FROM pizzas", fetch=True)
            if result[0][0] > 0:
                return
                
            # Datos del menú
            pizzas_data = [
                (1, "Margherita Clásica", "clasica", "🍕", "Salsa de tomate, mozzarella fresca, albahaca, aceite de oliva", 189.00, "15-20 min"),
                (2, "Pepperoni Supreme", "clasica", "🍕", "Salsa de tomate, mozzarella, pepperoni extra, orégano", 219.00, "18-23 min"),
                (3, "Cuatro Quesos", "premium", "🧀", "Salsa blanca, mozzarella, parmesano, gorgonzola, queso cabra", 269.00, "20-25 min"),
                (4, "Hawaiana Tropical", "clasica", "🍍", "Salsa de tomate, mozzarella, jamón, piña natural", 239.00, "16-21 min"),
                (5, "Vegetariana Garden", "veggie", "🥬", "Salsa de tomate, mozzarella, pimientos, champiñones, cebolla, aceitunas", 229.00, "17-22 min"),
                (6, "Meat Lovers", "premium", "🥩", "Salsa BBQ, mozzarella, pepperoni, salchicha, jamón, tocino", 299.00, "22-27 min"),
                (7, "Mediterránea", "premium", "🫒", "Salsa pesto, mozzarella, tomates cherry, aceitunas, rúcula, queso feta", 279.00, "19-24 min"),
                (8, "Vegana Delight", "veggie", "🌱", "Salsa de tomate, queso vegano, vegetales asados, espinacas", 259.00, "20-25 min")
            ]
            
            for pizza_data in pizzas_data:
                self.execute_with_retry('''
                    INSERT OR IGNORE INTO pizzas (id, name, category, emoji, ingredients, price, time_range)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', pizza_data)
            
            # Datos de ingredientes iniciales
            ingredients_data = [
                ("Salsa de tomate", 150),
                ("Mozzarella", 120),
                ("Pepperoni", 80),
                ("Jamón", 90),
                ("Piña", 60),
                ("Champiñones", 70),
                ("Pimientos", 85),
                ("Aceitunas", 55),
                ("Albahaca", 40),
                ("Queso parmesano", 45),
                ("Gorgonzola", 35),
                ("Queso cabra", 30)
            ]
            
            for ingredient_data in ingredients_data:
                self.execute_with_retry('''
                    INSERT OR IGNORE INTO ingredients (name, stock) VALUES (?, ?)
                ''', ingredient_data)
            
            # Estado del restaurante
            self.execute_with_retry('''
                INSERT OR IGNORE INTO restaurant_status (id, current_orders, average_wait_time, status)
                VALUES (1, 0, 25, 'Recibiendo órdenes')
            ''')
            
            print("Datos iniciales insertados correctamente")
            
        except Exception as e:
            print(f"Error al poblar datos iniciales: {e}")

class OrderManager:
    """Gestor de órdenes y tiempos de espera"""
    
    def __init__(self, db):
        self.db = db
        self.active_orders = []
        self.start_order_processor()
    
    def add_order(self, order_data):
        """Agregar nueva orden"""
        try:
            order_json = json.dumps(order_data['items'])
            estimated_time = self.calculate_estimated_time(order_data['items'])
            
            order_id = self.db.execute_with_retry('''
                INSERT INTO orders (order_data, total_price, estimated_time, customer_name, payment_method, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                order_json,
                order_data['total'],
                estimated_time,
                order_data.get('customer', 'Cliente'),
                order_data.get('payment', 'efectivo'),
                'received'
            ))
            
            # Actualizar estado del restaurante
            self.update_restaurant_status()
            
            # Agregar a órdenes activas
            new_order = {
                'id': order_id,
                'items': order_data['items'],
                'total': order_data['total'],
                'estimated_time': estimated_time,
                'customer': order_data.get('customer', 'Cliente'),
                'payment': order_data.get('payment', 'efectivo'),
                'status': 'received',
                'created_at': datetime.now(),
                'progress': 0
            }
            self.active_orders.append(new_order)
            
            print(f"Nueva orden agregada: #{order_id}")
            return order_id
            
        except Exception as e:
            print(f"Error al agregar orden: {e}")
            return None
    
    def calculate_estimated_time(self, items):
        """Calcular tiempo estimado basado en los items"""
        base_time = 15
        total_items = sum(item.get('quantity', 1) for item in items)
        
        # Tiempo base + tiempo extra por cantidad
        extra_time = max(0, (total_items - 1) * 3)
        
        # Agregar tiempo por carga actual
        current_load = len(self.active_orders)
        load_time = current_load * 2
        
        return min(base_time + extra_time + load_time, 60)
    
    def update_restaurant_status(self):
        """Actualizar estado general del restaurante"""
        try:
            current_orders = len(self.active_orders)
            avg_wait = self.calculate_average_wait_time()
            
            # Determinar estado basado en la carga
            if current_orders == 0:
                status = "Recibiendo órdenes"
            elif current_orders < 3:
                status = "Operando normalmente"
            elif current_orders < 6:
                status = "Demanda moderada"
            else:
                status = "Hora pico - Mayor demanda"
            
            self.db.execute_with_retry('''
                UPDATE restaurant_status 
                SET current_orders = ?, average_wait_time = ?, status = ?, last_updated = CURRENT_TIMESTAMP
                WHERE id = 1
            ''', (current_orders, avg_wait, status))
            
        except Exception as e:
            print(f"Error al actualizar estado del restaurante: {e}")
    
    def calculate_average_wait_time(self):
        """Calcular tiempo promedio de espera"""
        if not self.active_orders:
            return 25
        
        total_time = sum(order['estimated_time'] for order in self.active_orders)
        return max(20, min(50, total_time // len(self.active_orders)))
    
    def start_order_processor(self):
        """Iniciar procesador de órdenes en hilo separado"""
        def process_orders():
            while True:
                try:
                    current_time = datetime.now()
                    orders_to_remove = []
                    
                    for order in self.active_orders:
                        # Calcular progreso basado en tiempo transcurrido
                        elapsed = (current_time - order['created_at']).total_seconds() / 60
                        progress = min(100, (elapsed / order['estimated_time']) * 100)
                        order['progress'] = progress
                        
                        # Actualizar estado de la orden
                        if progress >= 100:
                            order['status'] = 'completed'
                            orders_to_remove.append(order)
                            self.complete_order(order['id'])
                        elif progress >= 75:
                            order['status'] = 'ready'
                        elif progress >= 50:
                            order['status'] = 'cooking'
                        elif progress >= 25:
                            order['status'] = 'preparing'
                    
                    # Remover órdenes completadas
                    for completed_order in orders_to_remove:
                        self.active_orders.remove(completed_order)
                    
                    # Actualizar estado del restaurante
                    if orders_to_remove:
                        self.update_restaurant_status()
                    
                    time.sleep(30)  # Revisar cada 30 segundos
                    
                except Exception as e:
                    print(f"Error en procesador de órdenes: {e}")
                    time.sleep(60)
        
        thread = threading.Thread(target=process_orders, daemon=True)
        thread.start()
    
    def complete_order(self, order_id):
        """Marcar orden como completada"""
        try:
            self.db.execute_with_retry('''
                UPDATE orders 
                SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (order_id,))
            
        except Exception as e:
            print(f"Error al completar orden {order_id}: {e}")

# Función para limpiar al cerrar la aplicación
def cleanup():
    print("Cerrando aplicación de forma segura...")

# Registrar función de limpieza
atexit.register(cleanup)
signal.signal(signal.SIGTERM, lambda s, f: cleanup())

# Inicializar base de datos y gestor de órdenes
try:
    db = PizzaDePrizzaDB(DB_NAME)
    order_manager = OrderManager(db)
    print("Sistema inicializado correctamente")
except Exception as e:
    print(f"Error al inicializar sistema: {e}")
    exit(1)

# Resto de las rutas del API sin cambios...
@app.route('/')
def index():
    """Servir página principal"""
    return render_template('index.html')

@app.route('/chef')
def chef_panel():
    """Servir panel de chef"""
    return render_template('chef_panel.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Servir archivos estáticos"""
    return send_from_directory('.', filename)

@app.route('/api/menu', methods=['GET'])
def get_menu():
    """Obtener menú completo"""
    try:
        result = db.execute_with_retry('''
            SELECT id, name, category, emoji, ingredients, price, time_range, available
            FROM pizzas WHERE available = 1
        ''', fetch=True)
        
        pizzas = []
        for row in result:
            pizzas.append({
                'id': row[0],
                'name': row[1],
                'category': row[2],
                'emoji': row[3],
                'ingredients': row[4],
                'price': row[5],
                'time': row[6],
                'available': bool(row[7])
            })
        
        return jsonify({'menu': pizzas, 'status': 'success'})
        
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route('/api/orders', methods=['POST'])
def create_order():
    """Crear nueva orden"""
    try:
        order_data = request.get_json()
        
        if not order_data or 'items' not in order_data:
            return jsonify({'error': 'Datos de orden inválidos'}), 400
        
        print(f"Creando orden: {order_data}")
        order_id = order_manager.add_order(order_data)
        
        if order_id:
            estimated_time = order_manager.calculate_estimated_time(order_data['items'])
            return jsonify({
                'order_id': order_id,
                'estimated_time': estimated_time,
                'status': 'success',
                'message': 'Orden creada exitosamente',
                'customer': order_data.get('customer'),
                'payment': order_data.get('payment')
            })
        else:
            return jsonify({'error': 'Error al crear la orden'}), 500
            
    except Exception as e:
        print(f"Error en create_order: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/status', methods=['GET'])
def get_orders_status():
    """Obtener estado general de órdenes"""
    try:
        result = db.execute_with_retry('''
            SELECT current_orders, average_wait_time, status, last_updated
            FROM restaurant_status WHERE id = 1
        ''', fetch=True)
        
        if result:
            row = result[0]
            return jsonify({
                'currentOrders': row[0],
                'averageWaitTime': row[1],
                'status': row[2],
                'lastUpdated': row[3],
                'activeOrders': len(order_manager.active_orders)
            })
        else:
            return jsonify({'error': 'No se pudo obtener el estado'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/debug/orders', methods=['GET'])
def debug_orders():
    """Debug endpoint para ver estado de órdenes - CON MANEJO DE ERRORES"""
    try:
        # Contar órdenes en DB con manejo de errores
        try:
            result = db.execute_with_retry('SELECT COUNT(*) FROM orders', fetch=True)
            db_count = result[0][0] if result else 0
        except Exception as e:
            print(f"Error al contar órdenes: {e}")
            db_count = -1  # Indicar error
        
        # Obtener últimas 5 órdenes con manejo de errores
        try:
            result = db.execute_with_retry(
                'SELECT id, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5', 
                fetch=True
            )
            recent_orders = result if result else []
        except Exception as e:
            print(f"Error al obtener órdenes recientes: {e}")
            recent_orders = []
        
        return jsonify({
            'database_orders_count': db_count,
            'active_orders_count': len(order_manager.active_orders),
            'recent_orders': recent_orders,
            'active_orders': [
                {'id': o['id'], 'status': o['status'], 'progress': o.get('progress', 0)}
                for o in order_manager.active_orders
            ],
            'database_status': 'ok' if db_count >= 0 else 'error'
        })
        
    except Exception as e:
        print(f"Error en debug endpoint: {e}")
        return jsonify({
            'error': str(e),
            'database_orders_count': -1,
            'active_orders_count': len(order_manager.active_orders) if order_manager else 0,
            'recent_orders': [],
            'active_orders': [],
            'database_status': 'error'
        }), 200  # Devolver 200 para que el cliente pueda ver el error

@app.route('/api/admin/orders', methods=['GET'])
def admin_get_orders():
    """Obtener todas las órdenes (para administración) - CON MANEJO DE ERRORES"""
    try:
        result = db.execute_with_retry('''
            SELECT id, order_data, total_price, estimated_time, customer_name, payment_method, status, created_at, completed_at
            FROM orders
            ORDER BY created_at DESC
            LIMIT 50
        ''', fetch=True)
        
        orders = []
        for row in result:
            try:
                items = json.loads(row[1]) if row[1] else []
            except:
                items = []
                
            orders.append({
                'id': row[0],
                'items': items,
                'total': row[2],
                'estimated_time': row[3] or 25,
                'customer': row[4] or 'Cliente',
                'payment': row[5] or 'efectivo',
                'status': row[6],
                'created_at': row[7],
                'completed_at': row[8]
            })
        
        # Combinar con órdenes activas
        active_orders_info = []
        for order in order_manager.active_orders:
            active_orders_info.append({
                'id': order['id'],
                'status': order['status'],
                'progress': order.get('progress', 0)
            })
        
        return jsonify({
            'orders': orders,
            'active_orders': active_orders_info,
            'total_active': len(order_manager.active_orders)
        })
        
    except Exception as e:
        print(f"Error en admin_get_orders: {e}")
        # Devolver datos básicos en caso de error
        return jsonify({
            'orders': [],
            'active_orders': [
                {'id': o['id'], 'status': o['status'], 'progress': o.get('progress', 0)}
                for o in order_manager.active_orders
            ] if order_manager else [],
            'total_active': len(order_manager.active_orders) if order_manager else 0,
            'error': str(e)
        })

@app.route('/api/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    """Actualizar estado de una orden específica"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': 'Status requerido'}), 400
        
        print(f"Actualizando orden {order_id} a estado: {new_status}")
        
        rowcount = db.execute_with_retry('''
            UPDATE orders SET status = ?, completed_at = CASE 
                WHEN ? = 'completed' THEN CURRENT_TIMESTAMP 
                ELSE completed_at 
            END
            WHERE id = ?
        ''', (new_status, new_status, order_id))
        
        if rowcount == 0:
            return jsonify({'error': 'Orden no encontrada'}), 404
        
        # Actualizar en órdenes activas también
        for order in order_manager.active_orders:
            if order['id'] == order_id:
                order['status'] = new_status
                print(f"Orden activa {order_id} actualizada a {new_status}")
                break
        
        return jsonify({
            'success': True,
            'order_id': order_id,
            'status': new_status
        })
        
    except Exception as e:
        print(f"Error en update_order_status: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/<int:order_id>/status', methods=['GET'])
def get_order_status(order_id):
    """Obtener estado específico de una orden"""
    try:
        # Buscar en órdenes activas
        for order in order_manager.active_orders:
            if order['id'] == order_id:
                return jsonify({
                    'order_id': order_id,
                    'status': order['status'],
                    'progress': order.get('progress', 0),
                    'estimated_time': order['estimated_time'],
                    'created_at': order['created_at'].isoformat()
                })
        
        # Buscar en base de datos
        result = db.execute_with_retry('''
            SELECT status, estimated_time, created_at, completed_at
            FROM orders WHERE id = ?
        ''', (order_id,), fetch=True)
        
        if result:
            row = result[0]
            return jsonify({
                'order_id': order_id,
                'status': row[0],
                'estimated_time': row[1],
                'created_at': row[2],
                'completed_at': row[3]
            })
        else:
            return jsonify({'error': 'Orden no encontrada'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🍕 Iniciando Pizza Deprizza Server...")
    print(f"📊 Base de datos: {DB_NAME}")
    print("🌐 Servidor ejecutándose en http://localhost:5000")
    print("👨‍🍳 Panel de chef: http://localhost:5000/chef")
    
    # Ejecutar servidor
    app.run(debug=True, host='0.0.0.0', port=5000)