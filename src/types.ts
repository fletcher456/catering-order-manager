export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category: string;
  servingSize?: number;
  regionImage?: string; // Base64 encoded image of the extracted PDF region
  confidence?: number; // Confidence score from topological analysis
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