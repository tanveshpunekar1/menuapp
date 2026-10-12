import fs from 'fs';
import os from 'os';
import path from 'path';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import embeddedDbJson from '../../data/db.json' with { type: 'json' };
import type { 
  User, Restaurant, Subscription, Category, MenuItem, 
  RestaurantTable, Order, OrderItem, Coupon, Customer, ActivityLog, TableServiceRequest 
} from '../types/index.ts';

let bundledDbSnapshot: any = embeddedDbJson || null;
try {
  const snapshotPath = path.resolve(process.cwd(), 'data', 'db.json');
  if (fs.existsSync(snapshotPath)) {
    bundledDbSnapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  }
} catch {
  // Fallback to embeddedDbJson bundled by esbuild
}

export interface DatabaseSchema {
  users: (User & { password_hash: string })[];
  restaurants: Restaurant[];
  subscriptions: Subscription[];
  categories: Category[];
  menu_items: MenuItem[];
  tables: RestaurantTable[];
  orders: Order[];
  order_items: OrderItem[];
  coupons: Coupon[];
  customers: Customer[];
  activity_logs: ActivityLog[];
  service_requests: TableServiceRequest[];
  next_order_number: number;
  tombstones?: string[];
}

const BUNDLED_DATA_DIR = path.resolve(process.cwd(), 'data');
const BUNDLED_DB_FILE = path.join(BUNDLED_DATA_DIR, 'db.json');

function resolveWritableDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY) {
    return path.join(os.tmpdir(), 'restoqr-data');
  }
  try {
    if (!fs.existsSync(BUNDLED_DATA_DIR)) {
      fs.mkdirSync(BUNDLED_DATA_DIR, { recursive: true });
    }
    fs.accessSync(BUNDLED_DATA_DIR, fs.constants.W_OK);
    return BUNDLED_DATA_DIR;
  } catch {
    return path.join(os.tmpdir(), 'restoqr-data');
  }
}

const DATA_DIR = resolveWritableDataDir();
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[Database] Could not create data directory:', err);
}

// Pre-computed bcrypt hashes for default accounts so cold starts on Vercel take <1ms
const DEFAULT_ADMIN_HASH = '$2b$10$a4j3o2utvRa4tXxkhcsK0.5KicmtYgkx77GvloTGNzpLmn4rP/XZS'; // Admin@12345
const DEFAULT_OWNER_HASH = '$2b$10$uuVdQtH6QZhZHqBYXSPeVepQ2i/5WYte8t92jN8WH9gSPypth5JyS'; // Owner@12345
const DEFAULT_KITCHEN_HASH = '$2b$10$x3SiADTDeYci4NS0TVrCTePCtUB8iLeiTjz57IZZLph6LUNwUtSBu'; // Kitchen@12345
const DEFAULT_WAITER_HASH = '$2b$10$a9wQfpksyHX3/Ll9eXsWhuaJGLMRpUsSeDl7KUP82DpARhOXRK6ze'; // Waiter@12345

function getInitialData(): DatabaseSchema {
  const adminHash = process.env.ADMIN_PASSWORD
    ? bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10)
    : DEFAULT_ADMIN_HASH;
  const ownerHash = DEFAULT_OWNER_HASH;
  const kitchenHash = DEFAULT_KITCHEN_HASH;
  const waiterHash = DEFAULT_WAITER_HASH;

  const restaurantId = 'rest-urban-bites-1';
  const ownerId = 'usr-owner-1';

  return {
    users: [
      {
        id: 'usr-admin-1',
        email: 'tanveshpunekar296@gmail.com',
        name: 'Tanvesh Punekar (Super Admin)',
        role: 'platform_admin',
        password_hash: adminHash,
        plain_password: process.env.ADMIN_PASSWORD || 'Admin@12345',
        created_at: new Date().toISOString()
      },
      {
        id: 'usr-admin-2',
        email: 'tanveshpunekar123@gmail.com',
        name: 'Tanvesh Punekar (Super Admin)',
        role: 'platform_admin',
        password_hash: adminHash,
        plain_password: process.env.ADMIN_PASSWORD || 'Admin@12345',
        created_at: new Date().toISOString()
      },
      {
        id: ownerId,
        email: 'owner@urbanbites.com',
        name: 'Vikram Malhotra',
        role: 'restaurant_owner',
        restaurant_id: restaurantId,
        password_hash: ownerHash,
        plain_password: 'Owner@12345',
        created_at: new Date().toISOString()
      },
      {
        id: 'usr-kitchen-1',
        email: 'kitchen@urbanbites.com',
        name: 'Chef Rajesh Sharma',
        role: 'kitchen_staff',
        restaurant_id: restaurantId,
        password_hash: kitchenHash,
        plain_password: 'Kitchen@12345',
        created_at: new Date().toISOString()
      },
      {
        id: 'usr-waiter-1',
        email: 'waiter@urbanbites.com',
        name: 'Sunil Verma',
        role: 'waiter',
        restaurant_id: restaurantId,
        password_hash: waiterHash,
        plain_password: 'Waiter@12345',
        created_at: new Date().toISOString()
      }
    ],
    restaurants: [
      {
        id: restaurantId,
        name: 'Urban Bites Cafe',
        slug: 'urban-bites-cafe',
        logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
        cover_image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
        phone: '+91 98765 43210',
        email: 'contact@urbanbites.com',
        address: '104 Heritage Boulevard, 12th Main, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        description: 'Artisan sourdough pizzas, gourmet smashed burgers, and handcrafted coffees served in a vibrant cafe ambience.',
        opening_time: '11:00 AM',
        closing_time: '11:30 PM',
        cuisine_type: 'Italian & Cafe Bistro',
        wifi_info: 'UrbanBites_Guest / Coffee2026',
        status: 'active',
        plan: 'pro',
        owner_id: ownerId,
        enabled_payments: {
          online: true,
          cash_table: true,
          cash_counter: true
        },
        upi_id: 'urbanbites@okaxis',
        upi_payee_name: 'Urban Bites Cafe',
        tax_rate: 5.0,
        service_charge_rate: 5.0,
        accepting_orders: true,
        order_validation_enabled: false,
        rating: 4.8,
        rating_count: 428,
        supported_languages: ['en', 'hi', 'mr'],
        active_theme: 'classic',
        allowed_themes: ['classic', 'hot_ready', 'premium_cafe', 'modern_app', 'custom_brand'],
        can_customize_theme: true,
        theme_config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    subscriptions: [
      {
        id: 'sub-1',
        restaurant_id: restaurantId,
        plan: 'pro',
        price: 3499,
        start_date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 335 * 24 * 3600 * 1000).toISOString().split('T')[0],
        status: 'active',
        payment_status: 'paid',
        payment_method: 'UPI / Razorpay',
        payment_reference: 'PAY_PRO_99412',
        notes: 'Annual Pro Subscription confirmed by Platform Admin'
      }
    ],
    categories: [
      {
        id: 'cat-1',
        restaurant_id: restaurantId,
        name: 'Artisan Pizzas',
        sort_order: 1,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cat-2',
        restaurant_id: restaurantId,
        name: 'Burgers & Sandwiches',
        sort_order: 2,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cat-3',
        restaurant_id: restaurantId,
        name: 'Appetizers & Starters',
        sort_order: 3,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cat-4',
        restaurant_id: restaurantId,
        name: 'Handcrafted Beverages',
        sort_order: 4,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cat-5',
        restaurant_id: restaurantId,
        name: 'Desserts & Sweets',
        sort_order: 5,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ],
    menu_items: [
      {
        id: 'item-1',
        restaurant_id: restaurantId,
        category_id: 'cat-1',
        name: 'Paneer Pizza',
        description: 'Tender marinated cottage cheese cubes, bell peppers, fresh mozzarella, and aromatic basil on stone-baked sourdough.',
        price: 299,
        discount_price: 269,
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
        weight: '350g',
        is_veg: true,
        spicy_level: 1,
        prep_time: 15,
        is_available: true,
        is_bestseller: true,
        is_recommended: true,
        sizes: [
          { name: 'Regular (8")', price_delta: 0 },
          { name: 'Medium (10")', price_delta: 80 },
          { name: 'Large (12")', price_delta: 150 }
        ],
        add_ons: [
          { id: 'addon-p1', name: 'Extra Mozzarella Cheese', price: 50 },
          { id: 'addon-p2', name: 'Extra Marinated Paneer', price: 70 },
          { id: 'addon-p3', name: 'Garlic Butter Crust', price: 35 },
          { id: 'addon-p4', name: 'Hot Honey Drizzle', price: 40 }
        ],
        spice_options: ['Mild', 'Medium Spicy', 'Fiery Hot'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'item-2',
        restaurant_id: restaurantId,
        category_id: 'cat-1',
        name: 'Truffle Wild Mushroom Pizza',
        description: 'Shiitake and cremini forest mushrooms, garlic oil, creamy fior di latte, and parmesan shavings.',
        price: 349,
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
        weight: '380g',
        is_veg: true,
        spicy_level: 0,
        prep_time: 18,
        is_available: true,
        is_bestseller: false,
        is_recommended: true,
        sizes: [
          { name: 'Regular (8")', price_delta: 0 },
          { name: 'Medium (10")', price_delta: 90 },
          { name: 'Large (12")', price_delta: 170 }
        ],
        add_ons: [
          { id: 'addon-tm1', name: 'Truffle Glaze Infusion', price: 60 },
          { id: 'addon-tm2', name: 'Parmesan Crisp Shavings', price: 45 }
        ],
        spice_options: ['Herbed (No Spice)', 'Mild Chili Flakes'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'item-3',
        restaurant_id: restaurantId,
        category_id: 'cat-1',
        name: 'Classic Pepperoni Pizza',
        description: 'Crisp smoked cured pepperoni slices, San Marzano tomato reduction, stringy mozzarella cheese.',
        price: 399,
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&auto=format&fit=crop&q=80',
        weight: '400g',
        is_veg: false,
        spicy_level: 2,
        prep_time: 15,
        is_available: true,
        is_bestseller: true,
        is_recommended: true,
        sizes: [
          { name: 'Regular (8")', price_delta: 0 },
          { name: 'Medium (10")', price_delta: 100 },
          { name: 'Large (12")', price_delta: 180 }
        ],
        add_ons: [
          { id: 'addon-pep1', name: 'Double Pepperoni Load', price: 90 },
          { id: 'addon-pep2', name: 'Cheese Burst Crust', price: 75 },
          { id: 'addon-pep3', name: 'Pickled Jalapeños', price: 30 }
        ],
        spice_options: ['Standard Spice', 'Smoky Fiery'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'item-4',
        restaurant_id: restaurantId,
        category_id: 'cat-2',
        name: 'Double Gourmet Smash Burger',
        description: 'Two crispy smashed ground beef patties, melted aged cheddar, caramelized shallots, house burger sauce in toasted brioche.',
        price: 249,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
        weight: '320g',
        is_veg: false,
        spicy_level: 1,
        prep_time: 12,
        is_available: true,
        is_bestseller: true,
        is_recommended: true,
        sizes: [
          { name: 'Single Patty', price_delta: -50 },
          { name: 'Double Smash (Standard)', price_delta: 0 },
          { name: 'Triple Monster Stack', price_delta: 90 }
        ],
        add_ons: [
          { id: 'addon-b1', name: 'Crispy Smoked Bacon', price: 60 },
          { id: 'addon-b2', name: 'Aged English Cheddar Slice', price: 40 },
          { id: 'addon-b3', name: 'Caramelized Onion Jam', price: 30 },
          { id: 'addon-b4', name: 'Fried Farm Egg', price: 35 }
        ],
        spice_options: ['Mild Mayo', 'Spicy Chipotle', 'Ghost Pepper'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'item-5',
        restaurant_id: restaurantId,
        category_id: 'cat-3',
        name: 'Crispy Peri-Peri Fries',
        description: 'Golden skin-on hand-cut potatoes tossed in spicy African bird eye chili seasoning and served with garlic mayo.',
        price: 149,
        image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80',
        weight: '200g',
        is_veg: true,
        spicy_level: 2,
        prep_time: 8,
        is_available: true,
        is_bestseller: false,
        is_recommended: true,
        sizes: [
          { name: 'Regular Basket', price_delta: 0 },
          { name: 'Large Sharing Tub', price_delta: 60 }
        ],
        add_ons: [
          { id: 'addon-f1', name: 'Melted Cheddar Cheese Dip', price: 45 },
          { id: 'addon-f2', name: 'Truffle Mayo Dip', price: 35 },
          { id: 'addon-f3', name: 'Crispy Fried Onion Bits', price: 25 }
        ],
        spice_options: ['Low Spice', 'Zesty Peri-Peri', 'Extra Tangy'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'item-6',
        restaurant_id: restaurantId,
        category_id: 'cat-4',
        name: 'Signature Cold Brew Float',
        description: 'Steeped single-origin Arabica over ice topped with rich creamy Tahitian vanilla bean gelato.',
        price: 189,
        image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
        weight: '350ml',
        is_veg: true,
        spicy_level: 0,
        prep_time: 5,
        is_available: true,
        is_bestseller: true,
        is_recommended: true,
        sizes: [
          { name: 'Regular (350ml)', price_delta: 0 },
          { name: 'Grande (500ml)', price_delta: 50 }
        ],
        add_ons: [
          { id: 'addon-cb1', name: 'Double Espresso Shot', price: 40 },
          { id: 'addon-cb2', name: 'Salted Caramel Syrup', price: 30 },
          { id: 'addon-cb3', name: 'Oat Milk Sub', price: 35 }
        ],
        spice_options: ['Sweet', 'Unsweetened / Keto'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'item-7',
        restaurant_id: restaurantId,
        category_id: 'cat-5',
        name: 'Sizzling Walnut Brownie with Ice Cream',
        description: 'Dense dark Belgian chocolate fudge brownie served sizzling with vanilla scoop and warm melted chocolate drizzle.',
        price: 199,
        image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
        weight: '220g',
        is_veg: true,
        spicy_level: 0,
        prep_time: 10,
        is_available: true,
        is_bestseller: true,
        is_recommended: true,
        sizes: [
          { name: 'Single Serving', price_delta: 0 },
          { name: 'Double Indulgence', price_delta: 90 }
        ],
        add_ons: [
          { id: 'addon-br1', name: 'Extra Vanilla Bean Scoop', price: 45 },
          { id: 'addon-br2', name: 'Roasted Almond Flakes', price: 30 },
          { id: 'addon-br3', name: 'Hot Belgian Ganache Pour', price: 35 }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'item-8',
        restaurant_id: restaurantId,
        category_id: 'cat-3',
        name: 'Garlic Parmesan Herb Dough-Balls',
        description: 'Warm fluffy sourdough balls glazed with roasted garlic rosemary herb butter and served with marinara dip.',
        price: 169,
        image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600&auto=format&fit=crop&q=80',
        weight: '180g',
        is_veg: true,
        spicy_level: 0,
        prep_time: 10,
        is_available: true,
        is_bestseller: false,
        is_recommended: false,
        add_ons: [
          { id: 'addon-gb1', name: 'Warm Spicy Marinara Bowl', price: 30 },
          { id: 'addon-gb2', name: 'Smoked Jalapeno Cheese Dip', price: 45 }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    tables: [
      {
        id: 'tbl-1',
        restaurant_id: restaurantId,
        table_number: 1,
        capacity: 2,
        status: 'available',
        created_at: new Date().toISOString()
      },
      {
        id: 'tbl-2',
        restaurant_id: restaurantId,
        table_number: 2,
        capacity: 4,
        status: 'available',
        created_at: new Date().toISOString()
      },
      {
        id: 'tbl-3',
        restaurant_id: restaurantId,
        table_number: 3,
        capacity: 4,
        status: 'available',
        created_at: new Date().toISOString()
      },
      {
        id: 'tbl-4',
        restaurant_id: restaurantId,
        table_number: 4,
        capacity: 6,
        status: 'available',
        created_at: new Date().toISOString()
      },
      {
        id: 'tbl-5',
        restaurant_id: restaurantId,
        table_number: 5,
        capacity: 2,
        status: 'available',
        created_at: new Date().toISOString()
      }
    ],
    orders: [
      {
        id: 'ord-1040',
        order_number: 1040,
        restaurant_id: restaurantId,
        table_id: 'tbl-2',
        table_number: 2,
        customer_name: 'Ananya Roy',
        customer_phone: '+91 99887 76655',
        status: 'SERVED',
        payment_method: 'online',
        payment_status: 'paid',
        subtotal: 548,
        discount: 50,
        tax: 24.9,
        total: 522.9,
        coupon_id: 'cpn-1',
        coupon_code: 'SAVE50',
        items: [
          {
            id: 'oi-1',
            order_id: 'ord-1040',
            menu_item_id: 'item-1',
            item_name_snapshot: 'Paneer Pizza',
            price_snapshot: 299,
            quantity: 1,
            created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString()
          },
          {
            id: 'oi-2',
            order_id: 'ord-1040',
            menu_item_id: 'item-4',
            item_name_snapshot: 'Double Gourmet Smash Burger',
            price_snapshot: 249,
            quantity: 1,
            created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString()
          }
        ],
        created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      },
      {
        id: 'ord-1041',
        order_number: 1041,
        restaurant_id: restaurantId,
        table_id: 'tbl-4',
        table_number: 4,
        customer_name: 'Rahul Khanna',
        customer_phone: '+91 98111 22334',
        status: 'PREPARING',
        payment_method: 'cash_table',
        payment_status: 'pending',
        subtotal: 797,
        discount: 0,
        tax: 39.85,
        total: 836.85,
        items: [
          {
            id: 'oi-3',
            order_id: 'ord-1041',
            menu_item_id: 'item-3',
            item_name_snapshot: 'Classic Pepperoni Pizza',
            price_snapshot: 399,
            quantity: 2,
            customization: 'Extra crispy crust',
            created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
          }
        ],
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      }
    ],
    order_items: [],
    coupons: [
      {
        id: 'cpn-1',
        restaurant_id: restaurantId,
        code: 'SAVE50',
        discount_type: 'fixed',
        discount_value: 50,
        min_order_amount: 300,
        start_date: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
        usage_limit: 1000,
        used_count: 24,
        per_customer_limit: 1,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cpn-2',
        restaurant_id: restaurantId,
        code: 'WELCOME20',
        discount_type: 'percentage',
        discount_value: 20,
        min_order_amount: 250,
        max_discount_amount: 100,
        start_date: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
        usage_limit: 500,
        used_count: 12,
        per_customer_limit: 1,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ],
    customers: [
      {
        id: 'cst-1',
        restaurant_id: restaurantId,
        name: 'Ananya Roy',
        phone: '+91 99887 76655',
        email: 'ananya@example.com',
        orders_count: 3,
        total_spent: 1640,
        last_order_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        loyalty_points: 160,
        created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'cst-2',
        restaurant_id: restaurantId,
        name: 'Rahul Khanna',
        phone: '+91 98111 22334',
        orders_count: 1,
        total_spent: 836.85,
        last_order_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        loyalty_points: 80,
        created_at: new Date().toISOString()
      }
    ],
    activity_logs: [
      {
        id: 'act-1',
        user_email: 'tanveshpunekar296@gmail.com',
        action: 'PLATFORM_INIT',
        details: 'Multi-restaurant QR ordering platform initialized',
        timestamp: new Date().toISOString()
      },
      {
        id: 'act-2',
        user_email: 'tanveshpunekar296@gmail.com',
        action: 'RESTAURANT_CREATED',
        details: 'Created restaurant Urban Bites Cafe (Pro Plan)',
        timestamp: new Date().toISOString()
      }
    ],
    service_requests: [],
    next_order_number: 1042
  };
}

const DB_BACKUP_FILE = path.join(DATA_DIR, 'db.backup.json');
const DB_TMP_FILE = path.join(DATA_DIR, 'db.tmp.json');

// Supabase Cloud Configuration
const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://ggaafpjdwlnvwhjjayem.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_API_KEY ||
  'sb_publishable_yH2wODaInn1PemvPGyyknw_eVc-3tR_';

const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseKey && 
  !supabaseUrl.includes('your-project-id') &&
  !supabaseKey.includes('your-supabase-')
);

class Database {
  private data: DatabaseSchema;
  public supabase: any = null;
  public isCloudConfigured: boolean = false;
  private syncTimeout: NodeJS.Timeout | null = null;
  public lastSyncTime: string | null = null;
  public lastSyncStatus: string = 'Initialized';

  constructor() {
    this.data = this.load();
    this.initSupabase();
  }

  private initSupabase() {
    if (isSupabaseConfigured) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false }
        });
        this.isCloudConfigured = true;
        console.log(`[Database] Supabase client initialized for ${supabaseUrl}`);
        // Asynchronously attempt to sync from Supabase if local only has default
        setTimeout(() => {
          this.autoRestoreFromCloudIfEmpty();
        }, 1500);
      } catch (err) {
        console.warn('[Database] Failed to initialize Supabase client:', err);
      }
    }
  }

  private load(): DatabaseSchema {
    // 1. Try primary db.json
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        if (raw && raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.restaurants) && Array.isArray(parsed.users)) {
            this.sanitizeData(parsed);
            return parsed;
          }
        }
      } catch (e) {
        console.error('[Database] Primary db.json corrupted or invalid. Attempting backup restore...', e);
      }
    }

    // 1b. If running on Vercel and /tmp/restoqr-data/db.json does not exist yet, read bundled data/db.json from disk
    if (BUNDLED_DB_FILE !== DB_FILE && fs.existsSync(BUNDLED_DB_FILE)) {
      try {
        const bundledRaw = fs.readFileSync(BUNDLED_DB_FILE, 'utf-8');
        if (bundledRaw && bundledRaw.trim().length > 0) {
          const parsedBundled = JSON.parse(bundledRaw);
          if (parsedBundled && Array.isArray(parsedBundled.restaurants) && Array.isArray(parsedBundled.users)) {
            this.sanitizeData(parsedBundled);
            this.saveData(parsedBundled);
            return parsedBundled;
          }
        }
      } catch (eb) {
        console.warn('[Database] Could not read bundled db.json:', eb);
      }
    }

    // 1c. Use statically imported data/db.json snapshot (guaranteed to exist inside Vercel serverless bundle)
    if (bundledDbSnapshot && Array.isArray((bundledDbSnapshot as any).restaurants) && Array.isArray((bundledDbSnapshot as any).users)) {
      try {
        const clonedSnapshot = JSON.parse(JSON.stringify(bundledDbSnapshot));
        this.sanitizeData(clonedSnapshot);
        this.saveData(clonedSnapshot);
        return clonedSnapshot;
      } catch (es) {
        console.warn('[Database] Could not load embedded db snapshot:', es);
      }
    }

    // 2. Try backup db.backup.json
    if (fs.existsSync(DB_BACKUP_FILE)) {
      try {
        const backupRaw = fs.readFileSync(DB_BACKUP_FILE, 'utf-8');
        if (backupRaw && backupRaw.trim().length > 0) {
          const parsedBackup = JSON.parse(backupRaw);
          if (parsedBackup && Array.isArray(parsedBackup.restaurants) && Array.isArray(parsedBackup.users)) {
            console.warn('[Database] Successfully restored database from backup file!');
            this.sanitizeData(parsedBackup);
            this.saveData(parsedBackup);
            return parsedBackup;
          }
        }
      } catch (e2) {
        console.error('[Database] Backup file also failed to load:', e2);
      }
    }

    // 3. Last fallback: initial demo seed data
    console.warn('[Database] Initializing fresh database defaults');
    const initial = getInitialData();
    this.saveData(initial);
    return initial;
  }

  private sanitizeData(data: any) {
    if (!data.users) data.users = [];
    if (!data.restaurants) data.restaurants = [];
    if (!data.subscriptions) data.subscriptions = [];
    if (!data.categories) data.categories = [];
    if (!data.menu_items) data.menu_items = [];
    if (!data.tables) data.tables = [];
    if (!data.orders) data.orders = [];
    if (!data.coupons) data.coupons = [];
    if (!data.customers) data.customers = [];
    if (!data.activity_logs) data.activity_logs = [];
    if (!data.service_requests) data.service_requests = [];
    if (!Array.isArray(data.tombstones)) data.tombstones = [];
    if (typeof data.next_order_number !== 'number') data.next_order_number = 1042;

    // Permanently purge any tombstoned (deleted) IDs so they never come back
    if (data.tombstones.length > 0) {
      const dead = new Set<string>(data.tombstones.map((id: any) => String(id)));
      data.restaurants = data.restaurants.filter((r: any) => !dead.has(String(r.id)));
      data.users = data.users.filter((u: any) => !dead.has(String(u.id)) && (!u.restaurant_id || !dead.has(String(u.restaurant_id))));
      data.subscriptions = data.subscriptions.filter((s: any) => !dead.has(String(s.id)) && !dead.has(String(s.restaurant_id)));
      data.categories = data.categories.filter((c: any) => !dead.has(String(c.id)) && !dead.has(String(c.restaurant_id)));
      data.menu_items = data.menu_items.filter((m: any) => !dead.has(String(m.id)) && !dead.has(String(m.restaurant_id)));
      data.tables = data.tables.filter((t: any) => !dead.has(String(t.id)) && !dead.has(String(t.restaurant_id)));
      data.coupons = data.coupons.filter((c: any) => !dead.has(String(c.id)) && !dead.has(String(c.restaurant_id)));
      data.orders = data.orders.filter((o: any) => !dead.has(String(o.id)) && !dead.has(String(o.restaurant_id)));
    }

    const adminHash = process.env.ADMIN_PASSWORD
      ? bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10)
      : DEFAULT_ADMIN_HASH;
    const defaultAdmins = [
      {
        id: 'usr-admin-1',
        email: 'tanveshpunekar296@gmail.com',
        name: 'Tanvesh Punekar (Super Admin)',
        role: 'platform_admin' as const,
        password_hash: adminHash,
        plain_password: process.env.ADMIN_PASSWORD || 'Admin@12345',
        created_at: new Date().toISOString()
      },
      {
        id: 'usr-admin-2',
        email: 'tanveshpunekar123@gmail.com',
        name: 'Tanvesh Punekar (Super Admin)',
        role: 'platform_admin' as const,
        password_hash: adminHash,
        plain_password: process.env.ADMIN_PASSWORD || 'Admin@12345',
        created_at: new Date().toISOString()
      }
    ];
    // Ensure default master admins exist (do NOT re-add deleted staff)
    defaultAdmins.forEach(initUser => {
      const existingAdmin = data.users.find((u: any) => u.email.toLowerCase() === initUser.email.toLowerCase());
      if (!existingAdmin) {
        data.users.push(initUser);
      } else if (process.env.ADMIN_PASSWORD) {
        existingAdmin.password_hash = adminHash;
        existingAdmin.plain_password = process.env.ADMIN_PASSWORD;
      }
    });

    // Backfill plain_password on default seed users if missing so Master Admin can view them
    const defaultPassMap: Record<string, string> = {
      'tanveshpunekar296@gmail.com': process.env.ADMIN_PASSWORD || 'Admin@12345',
      'tanveshpunekar123@gmail.com': process.env.ADMIN_PASSWORD || 'Admin@12345',
      'owner@urbanbites.com': 'Owner@12345',
      'kitchen@urbanbites.com': 'Kitchen@12345',
      'waiter@urbanbites.com': 'Waiter@12345'
    };
    data.users.forEach((u: any) => {
      if (!u.plain_password && defaultPassMap[u.email.toLowerCase()]) {
        u.plain_password = defaultPassMap[u.email.toLowerCase()];
      }
    });

    data.restaurants.forEach((r: any) => {
      if (r.accepting_orders === undefined) r.accepting_orders = true;
      if (r.order_validation_enabled === undefined) r.order_validation_enabled = false;
      if (r.online_payment_enabled === undefined) {
        r.online_payment_enabled = r.enabled_payments?.online !== undefined ? Boolean(r.enabled_payments.online) : true;
      }
      if (r.water_bottle_price === undefined) r.water_bottle_price = 20;
      if (r.service_charge_rate === undefined) r.service_charge_rate = 5.0;
      if (r.rating === undefined) r.rating = 4.8;
      if (r.rating_count === undefined) r.rating_count = 428;
      if (!r.supported_languages) r.supported_languages = ['en', 'hi', 'mr'];
      if (!r.active_theme) r.active_theme = 'classic';
      if (!Array.isArray(r.allowed_themes) || r.allowed_themes.length === 0) {
        r.allowed_themes =
          r.plan === 'pro' || r.plan === 'custom'
            ? ['classic', 'hot_ready', 'premium_cafe', 'modern_app', 'custom_brand']
            : r.plan === 'growth'
              ? ['classic', 'hot_ready', 'premium_cafe', 'modern_app']
              : ['classic'];
      }
      if (r.can_customize_theme === undefined) {
        r.can_customize_theme = r.plan !== 'starter';
      }
      if (!r.theme_config || typeof r.theme_config !== 'object') {
        r.theme_config = {};
      }
    });
  }

  private saveData(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const jsonString = JSON.stringify(data, null, 2);
      // Atomic write: write to temp file then rename (prevents corruption on unexpected process kill)
      fs.writeFileSync(DB_TMP_FILE, jsonString, 'utf-8');
      fs.renameSync(DB_TMP_FILE, DB_FILE);

      // Create backup copy asynchronously
      try {
        fs.copyFileSync(DB_FILE, DB_BACKUP_FILE);
      } catch (be) {
        // Non-critical
      }
    } catch (e) {
      console.warn('[Database] Notice: Running in memory / ephemeral storage mode:', (e as any)?.message || e);
    }
  }

  public hasSyncedFromCloud: boolean = false;
  public hasLocalMutations: boolean = false;
  private initialLoadPromise: Promise<void> | null = null;

  public recordTombstone(id: string) {
    if (!id) return;
    if (!Array.isArray(this.data.tombstones)) {
      this.data.tombstones = [];
    }
    const cleanId = String(id).trim();
    if (cleanId && !this.data.tombstones.includes(cleanId)) {
      this.data.tombstones.push(cleanId);
    }
    this.hasLocalMutations = true;
  }

  public applyTombstones(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) return;
    let changed = false;
    if (!Array.isArray(this.data.tombstones)) {
      this.data.tombstones = [];
    }
    for (const rawId of ids) {
      const id = String(rawId || '').trim();
      if (id && !this.data.tombstones.includes(id)) {
        this.data.tombstones.push(id);
        changed = true;
      }
    }
    const dead = new Set<string>(this.data.tombstones);
    const prevCounts =
      this.data.restaurants.length +
      this.data.menu_items.length +
      this.data.categories.length +
      this.data.tables.length +
      this.data.coupons.length +
      this.data.users.length +
      this.data.orders.length;

    this.data.restaurants = this.data.restaurants.filter(r => !dead.has(String(r.id)));
    this.data.users = this.data.users.filter(u => !dead.has(String(u.id)) && (!u.restaurant_id || !dead.has(String(u.restaurant_id))));
    this.data.subscriptions = this.data.subscriptions.filter(s => !dead.has(String(s.id)) && !dead.has(String(s.restaurant_id)));
    this.data.categories = this.data.categories.filter(c => !dead.has(String(c.id)) && !dead.has(String(c.restaurant_id)));
    this.data.menu_items = this.data.menu_items.filter(m => !dead.has(String(m.id)) && !dead.has(String(m.restaurant_id)));
    this.data.tables = this.data.tables.filter(t => !dead.has(String(t.id)) && !dead.has(String(t.restaurant_id)));
    this.data.coupons = this.data.coupons.filter(c => !dead.has(String(c.id)) && !dead.has(String(c.restaurant_id)));
    this.data.orders = this.data.orders.filter(o => !dead.has(String(o.id)) && !dead.has(String(o.restaurant_id)));

    const nextCounts =
      this.data.restaurants.length +
      this.data.menu_items.length +
      this.data.categories.length +
      this.data.tables.length +
      this.data.coupons.length +
      this.data.users.length +
      this.data.orders.length;

    if (changed || prevCounts !== nextCounts) {
      this.hasLocalMutations = true;
      this.saveData(this.data);
    }
  }

  public applyClientJournal(journal: any) {
    if (!journal || typeof journal !== 'object') return;
    let mutated = false;

    if (Array.isArray(journal.tombstones) && journal.tombstones.length > 0) {
      this.applyTombstones(journal.tombstones);
    }

    const dead = new Set<string>(this.data.tombstones || []);

    const mergeCollection = <T extends { id: string }>(
      current: T[],
      incomingMapOrArr: Record<string, T> | T[] | undefined,
      matchFn?: (existing: T, inc: T) => boolean
    ) => {
      if (!incomingMapOrArr) return;
      const list: T[] = Array.isArray(incomingMapOrArr) ? incomingMapOrArr : Object.values(incomingMapOrArr);
      for (const item of list) {
        if (!item || !item.id || dead.has(String(item.id))) continue;
        const idx = current.findIndex(existing => existing.id === item.id || (matchFn ? matchFn(existing, item) : false));
        if (idx === -1) {
          current.push(item);
          mutated = true;
        } else {
          current[idx] = { ...current[idx], ...item };
          mutated = true;
        }
      }
    };

    if (journal.restaurants) {
      const restList: any[] = Array.isArray(journal.restaurants) ? journal.restaurants : Object.values(journal.restaurants);
      for (const rest of restList) {
        if (!rest || !rest.id || dead.has(String(rest.id))) continue;
        const idx = this.data.restaurants.findIndex(r => r.id === rest.id || r.slug === rest.slug);
        if (idx === -1) {
          this.data.restaurants.push(rest);
          mutated = true;
          // Ensure subscription & default tables/categories exist for this hydrated restaurant
          if (!this.data.subscriptions.some(s => s.restaurant_id === rest.id)) {
            this.data.subscriptions.push({
              id: `sub-${rest.id}`,
              restaurant_id: rest.id,
              plan: rest.plan || 'growth',
              price: 1999,
              start_date: new Date().toISOString().split('T')[0],
              expiry_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
              status: 'active',
              payment_status: 'paid',
              payment_method: 'Admin Provisioned'
            });
          }
          if (!this.data.tables.some(t => t.restaurant_id === rest.id)) {
            const count = Number(rest.max_tables || rest.table_count) || 8;
            for (let i = 1; i <= count; i++) {
              this.data.tables.push({
                id: `tbl-${rest.id}-${i}`,
                restaurant_id: rest.id,
                table_number: i,
                capacity: i % 2 === 0 ? 4 : 2,
                status: 'available',
                created_at: new Date().toISOString()
              });
            }
          }
          if (!this.data.categories.some(c => c.restaurant_id === rest.id)) {
            const defaultCatId = `cat-${rest.id}-1`;
            this.data.categories.push({
              id: defaultCatId,
              restaurant_id: rest.id,
              name: 'Chef Specials',
              sort_order: 1,
              is_active: true,
              created_at: new Date().toISOString()
            });
            if (!this.data.menu_items.some(m => m.restaurant_id === rest.id)) {
              this.data.menu_items.push({
                id: `item-${rest.id}-1`,
                restaurant_id: rest.id,
                category_id: defaultCatId,
                name: `${rest.name} Signature Dish`,
                description: 'House specialty crafted with fresh local ingredients and signature seasonings.',
                price: 249,
                image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
                weight: '300g',
                is_veg: true,
                spicy_level: 1,
                prep_time: 15,
                is_available: true,
                is_bestseller: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          }
        } else {
          this.data.restaurants[idx] = { ...this.data.restaurants[idx], ...rest };
          mutated = true;
        }
      }
    }

    if (journal.users) {
      const userList: any[] = Array.isArray(journal.users) ? journal.users : Object.values(journal.users);
      for (const u of userList) {
        if (!u || !u.email || dead.has(String(u.id))) continue;
        const cleanEmail = String(u.email).trim().toLowerCase();
        const existingIdx = this.data.users.findIndex(
          eu => eu.id === u.id || (eu.email && eu.email.toLowerCase() === cleanEmail)
        );
        const passwordHash = u.password_hash || (u.plain_password ? bcrypt.hashSync(String(u.plain_password), 10) : '');
        if (existingIdx === -1) {
          this.data.users.push({
            id: u.id || `usr-${Date.now()}`,
            name: u.name || cleanEmail.split('@')[0],
            email: cleanEmail,
            role: u.role || 'restaurant_owner',
            restaurant_id: u.restaurant_id,
            password_hash: passwordHash,
            plain_password: u.plain_password,
            created_at: u.created_at || new Date().toISOString()
          });
          mutated = true;
        } else {
          const target = this.data.users[existingIdx];
          if (u.name) target.name = u.name;
          if (u.role) target.role = u.role;
          if (u.restaurant_id) target.restaurant_id = u.restaurant_id;
          if (u.plain_password) {
            target.plain_password = u.plain_password;
            target.password_hash = bcrypt.hashSync(String(u.plain_password), 10);
          }
          mutated = true;
        }
      }
    }

    mergeCollection(this.data.categories, journal.categories);
    mergeCollection(this.data.menu_items, journal.items);
    mergeCollection(this.data.tables, journal.tables);
    mergeCollection(this.data.coupons, journal.coupons);
    mergeCollection(this.data.orders, journal.orders);

    if (mutated) {
      this.hasLocalMutations = true;
      this.saveData(this.data);
    }
  }

  public save() {
    this.hasLocalMutations = true;
    this.saveData(this.data);
    this.scheduleCloudSync();
  }

  public async commitAndSync(): Promise<void> {
    this.hasLocalMutations = true;
    this.saveData(this.data);
    if (!this.supabase || !this.isCloudConfigured) return;
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
    try {
      await this.supabase.from('restoqr_cloud_store').upsert({
        key: 'restoqr_master_db',
        data: this.data,
        updated_at: new Date().toISOString()
      });
    } catch {
      // Fallback to relational sync if cloud_store not created
    }
    try {
      await this.syncToSupabase();
    } catch {
      // Non-fatal
    }
  }

  public async ensureCloudLoaded(): Promise<void> {
    if (this.hasSyncedFromCloud || this.hasLocalMutations || !this.supabase || !this.isCloudConfigured) return;
    if (!this.initialLoadPromise) {
      this.initialLoadPromise = (async () => {
        try {
          await this.syncFromSupabase();
        } catch {
          // ignore
        } finally {
          this.hasSyncedFromCloud = true;
        }
      })();
    }
    await this.initialLoadPromise;
  }

  public get<K extends keyof DatabaseSchema>(key: K): DatabaseSchema[K] {
    return this.data[key];
  }

  public set<K extends keyof DatabaseSchema>(key: K, value: DatabaseSchema[K]) {
    this.data[key] = value;
    this.save();
  }

  public update(fn: (data: DatabaseSchema) => void) {
    this.hasLocalMutations = true;
    fn(this.data);
    this.save();
  }

  public async updateAndSync(fn: (data: DatabaseSchema) => void): Promise<void> {
    await this.ensureCloudLoaded();
    this.hasLocalMutations = true;
    fn(this.data);
    await this.commitAndSync();
  }

  public resetToDefaults() {
    this.data = getInitialData();
    this.save();
  }

  public getAllData(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data));
  }

  public importBackup(imported: any): { success: boolean; message: string; restaurantCount: number } {
    if (!imported || !Array.isArray(imported.restaurants)) {
      throw new Error('Invalid backup format: missing restaurants array');
    }
    this.sanitizeData(imported);
    this.data = imported;
    this.save();
    return {
      success: true,
      message: `Successfully restored ${imported.restaurants.length} restaurants and their data!`,
      restaurantCount: imported.restaurants.length
    };
  }

  // ----------------------------------------------------
  // SUPABASE CLOUD SYNC & RECOVERY ENGINE
  // ----------------------------------------------------
  private scheduleCloudSync() {
    if (!this.supabase || !this.isCloudConfigured) return;
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => {
      this.commitAndSync().catch(err => {
        console.warn('[Database] Background cloud sync notice:', err.message);
      });
    }, 300);
  }

  public async checkSupabase(): Promise<{
    configured: boolean;
    connected: boolean;
    tables: Record<string, boolean>;
    allReady: boolean;
    cloudStoreReady: boolean;
    message: string;
    projectUrl: string;
  }> {
    if (!this.isCloudConfigured || !this.supabase) {
      return {
        configured: false,
        connected: false,
        tables: {},
        allReady: false,
        cloudStoreReady: false,
        message: 'Supabase credentials not configured in environment',
        projectUrl: supabaseUrl
      };
    }

    const tablesToCheck = [
      'restaurants', 'categories', 'menu_items', 'tables', 
      'orders', 'coupons', 'customers', 'profiles', 'service_requests'
    ];
    const tableStatus: Record<string, boolean> = {};

    try {
      // 1. Check cloud store table
      let cloudStoreReady = false;
      const { error: csErr } = await this.supabase.from('restoqr_cloud_store').select('key').limit(1);
      cloudStoreReady = !csErr;

      // 2. Check relational tables
      let readyCount = 0;
      for (const t of tablesToCheck) {
        const { error } = await this.supabase.from(t).select('id').limit(1);
        const ok = !error;
        tableStatus[t] = ok;
        if (ok) readyCount++;
      }

      const allReady = readyCount === tablesToCheck.length;
      let message = '';
      if (allReady && cloudStoreReady) {
        message = 'All Supabase tables and cloud store are 100% active and connected!';
      } else if (allReady) {
        message = 'All PostgreSQL relational tables are active and connected!';
      } else if (cloudStoreReady) {
        message = 'Cloud backup store is active! (Relational tables pending SQL execution)';
      } else {
        message = `Tables not found in Supabase yet. Please run the SQL schema in Supabase SQL Editor.`;
      }

      return {
        configured: true,
        connected: true,
        tables: tableStatus,
        allReady,
        cloudStoreReady,
        message,
        projectUrl: supabaseUrl
      };
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        tables: tableStatus,
        allReady: false,
        cloudStoreReady: false,
        message: err.message || 'Failed to connect to Supabase',
        projectUrl: supabaseUrl
      };
    }
  }

  public async syncToSupabase(): Promise<{ success: boolean; message: string; synced: Record<string, number> }> {
    if (!this.supabase || !this.isCloudConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const check = await this.checkSupabase();
    const stats: Record<string, number> = {};

    // 1. If restoqr_cloud_store is available, save master JSON backup instantly
    if (check.cloudStoreReady) {
      try {
        await this.supabase.from('restoqr_cloud_store').upsert({
          key: 'restoqr_master_db',
          data: this.data,
          updated_at: new Date().toISOString()
        });
        stats['restoqr_cloud_store'] = 1;
      } catch (err) {
        console.warn('[Database] Cloud store upsert error:', err);
      }
    }

    // 2. If relational tables are available, sync each entity table
    if (check.tables['restaurants']) {
      try {
        const baseRests = this.data.restaurants.map(r => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          logo: r.logo || '',
          cover_image: r.cover_image || '',
          phone: r.phone || '',
          email: r.email || '',
          address: r.address || '',
          city: r.city || '',
          state: r.state || '',
          pincode: r.pincode || '',
          description: r.description || '',
          opening_time: r.opening_time || '10:00 AM',
          closing_time: r.closing_time || '11:00 PM',
          cuisine_type: r.cuisine_type || 'Multi-Cuisine',
          wifi_info: r.wifi_info || '',
          status: r.status || 'active',
          plan: r.plan || 'growth',
          owner_id: r.owner_id,
          tax_rate: r.tax_rate ?? 5,
          service_charge_rate: r.service_charge_rate ?? 5,
          accepting_orders: r.accepting_orders ?? true,
          order_validation_enabled: r.order_validation_enabled ?? false,
          rating: r.rating ?? 4.8,
          rating_count: r.rating_count ?? 428,
          supported_languages: r.supported_languages || ['en', 'hi', 'mr'],
          enabled_payments: r.enabled_payments || { online: true, cash_table: true, cash_counter: true },
          upi_id: r.upi_id || '',
          upi_payee_name: r.upi_payee_name || '',
          service_expires_at: r.service_expires_at || null,
          is_banned: r.is_banned ?? false,
          ban_reason: r.ban_reason || null,
          created_at: r.created_at,
          updated_at: r.updated_at
        }));
        const restsWithThemes = this.data.restaurants.map((r, idx) => ({
          ...baseRests[idx],
          active_theme: r.active_theme || 'classic',
          allowed_themes: r.allowed_themes || ['classic', 'hot_ready', 'premium_cafe', 'modern_app', 'custom_brand'],
          can_customize_theme: r.can_customize_theme ?? true,
          theme_config: r.theme_config || {}
        }));
        if (restsWithThemes.length > 0) {
          const { error } = await this.supabase.from('restaurants').upsert(restsWithThemes, { onConflict: 'id' });
          if (!error) {
            stats['restaurants'] = restsWithThemes.length;
          } else {
            const { error: fallbackErr } = await this.supabase.from('restaurants').upsert(baseRests, { onConflict: 'id' });
            if (!fallbackErr) stats['restaurants'] = baseRests.length;
          }
        }
      } catch (e: any) {
        console.warn('[Database] Restaurants cloud sync:', e.message);
      }
    }

    if (check.tables['profiles']) {
      try {
        const profilesToSync = this.data.users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          restaurant_id: u.restaurant_id || null,
          password_hash: u.password_hash,
          created_at: u.created_at
        }));
        if (profilesToSync.length > 0) {
          const { error } = await this.supabase.from('profiles').upsert(profilesToSync, { onConflict: 'id' });
          if (!error) stats['profiles'] = profilesToSync.length;
        }
      } catch (e: any) {}
    }

    if (check.tables['categories']) {
      try {
        if (this.data.categories.length > 0) {
          const { error } = await this.supabase.from('categories').upsert(this.data.categories, { onConflict: 'id' });
          if (!error) stats['categories'] = this.data.categories.length;
        }
      } catch (e: any) {}
    }

    if (check.tables['menu_items']) {
      try {
        if (this.data.menu_items.length > 0) {
          const { error } = await this.supabase.from('menu_items').upsert(this.data.menu_items, { onConflict: 'id' });
          if (!error) stats['menu_items'] = this.data.menu_items.length;
        }
      } catch (e: any) {}
    }

    if (check.tables['tables']) {
      try {
        if (this.data.tables.length > 0) {
          const { error } = await this.supabase.from('tables').upsert(this.data.tables, { onConflict: 'id' });
          if (!error) stats['tables'] = this.data.tables.length;
        }
      } catch (e: any) {}
    }

    if (check.tables['orders']) {
      try {
        if (this.data.orders.length > 0) {
          const ordersToSync = this.data.orders.map(o => ({
            id: o.id,
            order_number: o.order_number,
            restaurant_id: o.restaurant_id,
            table_id: o.table_id || null,
            table_number: o.table_number,
            customer_name: o.customer_name || '',
            customer_phone: o.customer_phone || '',
            status: o.status,
            payment_method: o.payment_method,
            payment_status: o.payment_status,
            subtotal: o.subtotal,
            discount: o.discount || 0,
            tax: o.tax || 0,
            total: o.total,
            coupon_id: o.coupon_id || null,
            coupon_code: o.coupon_code || '',
            items: o.items || [],
            notes: o.notes || '',
            created_at: o.created_at,
            updated_at: o.updated_at
          }));
          const { error } = await this.supabase.from('orders').upsert(ordersToSync, { onConflict: 'id' });
          if (!error) stats['orders'] = ordersToSync.length;
        }
      } catch (e: any) {}
    }

    if (check.tables['coupons']) {
      try {
        if (this.data.coupons.length > 0) {
          const { error } = await this.supabase.from('coupons').upsert(this.data.coupons, { onConflict: 'id' });
          if (!error) stats['coupons'] = this.data.coupons.length;
        }
      } catch (e: any) {}
    }

    if (check.tables['customers']) {
      try {
        if (this.data.customers.length > 0) {
          const { error } = await this.supabase.from('customers').upsert(this.data.customers, { onConflict: 'id' });
          if (!error) stats['customers'] = this.data.customers.length;
        }
      } catch (e: any) {}
    }

    if (check.tables['service_requests']) {
      try {
        if (this.data.service_requests.length > 0) {
          const { error } = await this.supabase.from('service_requests').upsert(this.data.service_requests, { onConflict: 'id' });
          if (!error) stats['service_requests'] = this.data.service_requests.length;
        }
      } catch (e: any) {}
    }

    this.lastSyncTime = new Date().toISOString();
    this.lastSyncStatus = `Synced ${Object.keys(stats).length} tables`;
    return {
      success: true,
      message: `Cloud sync completed at ${new Date().toLocaleTimeString()}`,
      synced: stats
    };
  }

  public async syncFromSupabase(): Promise<{ success: boolean; message: string; restoredCount: number }> {
    if (!this.supabase || !this.isCloudConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const currentTombstones = Array.isArray(this.data.tombstones) ? [...this.data.tombstones] : [];

    // 1. Try restoring from restoqr_cloud_store first (complete JSON backup)
    try {
      const { data: cloudStoreData, error: csErr } = await this.supabase
        .from('restoqr_cloud_store')
        .select('data')
        .eq('key', 'restoqr_master_db')
        .maybeSingle();

      if (!csErr && cloudStoreData?.data && Array.isArray(cloudStoreData.data.restaurants)) {
        if (cloudStoreData.data.restaurants.length > 0) {
          const mergedTombstones = Array.from(new Set([...currentTombstones, ...(cloudStoreData.data.tombstones || [])]));
          cloudStoreData.data.tombstones = mergedTombstones;
          this.sanitizeData(cloudStoreData.data);
          this.data = cloudStoreData.data;
          this.saveData(this.data);
          return {
            success: true,
            message: `Restored ${cloudStoreData.data.restaurants.length} restaurants from Supabase cloud store!`,
            restoredCount: cloudStoreData.data.restaurants.length
          };
        }
      }
    } catch (err) {}

    // 2. Otherwise try restoring from relational tables
    try {
      const { data: cloudRestaurants, error: restErr } = await this.supabase.from('restaurants').select('*');
      if (!restErr && cloudRestaurants && cloudRestaurants.length > 0) {
        const [catsRes, itemsRes, tablesRes, ordersRes, couponsRes, customersRes, profilesRes] = await Promise.all([
          this.supabase.from('categories').select('*'),
          this.supabase.from('menu_items').select('*'),
          this.supabase.from('tables').select('*'),
          this.supabase.from('orders').select('*'),
          this.supabase.from('coupons').select('*'),
          this.supabase.from('customers').select('*'),
          this.supabase.from('profiles').select('*')
        ]);

        this.data.restaurants = cloudRestaurants;
        if (catsRes.data) this.data.categories = catsRes.data;
        if (itemsRes.data) this.data.menu_items = itemsRes.data;
        if (tablesRes.data) this.data.tables = tablesRes.data;
        if (ordersRes.data) this.data.orders = ordersRes.data;
        if (couponsRes.data) this.data.coupons = couponsRes.data;
        if (customersRes.data) this.data.customers = customersRes.data;
        if (profilesRes.data && profilesRes.data.length > 0) {
          for (const prof of profilesRes.data) {
            if (!this.data.users.some(u => u.id === prof.id || u.email.toLowerCase() === prof.email.toLowerCase())) {
              this.data.users.push(prof);
            }
          }
        }
        this.data.tombstones = currentTombstones;
        this.sanitizeData(this.data);
        this.saveData(this.data);
        return {
          success: true,
          message: `Restored ${this.data.restaurants.length} restaurants and menu items from Supabase tables!`,
          restoredCount: this.data.restaurants.length
        };
      }
    } catch (err: any) {
      throw new Error(`Failed to restore from Supabase tables: ${err.message}`);
    }

    return {
      success: false,
      message: 'No saved restaurants found in Supabase yet.',
      restoredCount: 0
    };
  }

  public async deleteCloudRow(tableName: string, rowId: string) {
    this.recordTombstone(rowId);
    if (!this.supabase || !this.isCloudConfigured) return;
    try {
      await this.supabase.from(tableName).delete().eq('id', rowId);
    } catch {
      // Ignore if table doesn't exist
    }
    try {
      await this.supabase.from('restoqr_cloud_store').upsert({
        key: 'restoqr_master_db',
        data: this.data,
        updated_at: new Date().toISOString()
      });
    } catch {
      // Ignore if cloud store table doesn't exist
    }
  }

  private async autoRestoreFromCloudIfEmpty() {
    try {
      if (this.hasLocalMutations) return;
      const hasCustomLocalData =
        this.data.restaurants.length > 1 ||
        this.data.restaurants.some(r => r.id !== 'rest-urban-bites-1');

      if (!hasCustomLocalData && this.data.restaurants.length <= 1) {
        const res = await this.syncFromSupabase();
        if (res.success && res.restoredCount > 0) {
          console.log(`[Database] Auto-restored ${res.restoredCount} restaurants from Supabase Cloud!`);
        }
      } else {
        await this.syncToSupabase();
      }
    } catch (err) {
      // Silent in background
    }
  }
}

export const db = new Database();

