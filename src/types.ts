export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category: string;
  servingSize?: number;
}

export interface CateringOrder {
  guestCount: number;
  items: OrderItem[];
  totalCost: number;
}

export interface OrderItem extends MenuItem {
  quantity: number;
  totalPrice: number;
}