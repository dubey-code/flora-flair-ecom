export interface Category {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  composition: string | null;
  care: string | null;
  price: number;
  old_price: number | null;
  category_id: string | null;
  tags: string[];
  images: string[];
  stock: number;
  published: boolean;
  featured: boolean;
  created_at?: string;
}


export interface OrderItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image: string | null;
  product_id: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  delivery_method: string;
  address: string | null;
  delivery_date: string | null;
  comment: string | null;
  items_total: number;
  delivery_price: number;
  total: number;
  status: string;
  created_at: string;
  updated_at?: string;
  order_items?: OrderItem[];
}

