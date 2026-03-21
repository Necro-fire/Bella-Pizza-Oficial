export type Category = 'pizza' | 'bebidas' | 'outros';

export interface Product {
  id: string;
  name: string;
  category: Category;
  image: string;
  price: number;
  cost: number;
  active: boolean;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao';

export interface PaymentSplit {
  method: PaymentMethod;
  amount: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sale {
  id: string;
  items: CartItem[];
  payments: PaymentSplit[];
  total: number;
  change: number;
  date: string;
}

export interface CashRegister {
  id: string;
  openedAt: string;
  closedAt?: string;
  initialAmount: number;
  sales: Sale[];
  entries: CashMovement[];
  exits: CashMovement[];
}

export interface CashMovement {
  id: string;
  type: 'entry' | 'exit';
  amount: number;
  description: string;
  paymentMethod?: PaymentMethod;
  date: string;
}

export type UserRole = 'admin' | 'employee';
