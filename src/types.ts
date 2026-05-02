export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'user';
  createdAt: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  description: string;
  location: string;
  currentQuantity: number;
  minStock: number;
  imageUrl?: string;
  lastUpdated: number;
  jobNumber?: string;
  client?: string;
  stockInDate?: number;
  brand?: string;
  modelNumber?: string;
  supplier?: string;
  outlet?: string;
  inventoryType?: 'Warehouse Stock' | 'Client Stock';
}

export interface StockTransaction {
  id: string;
  itemId: string;
  itemName: string;
  itemSku?: string;
  brand?: string;
  modelNumber?: string;
  type: 'IN' | 'OUT';
  quantity: number;
  client: string;
  date: number;
  userId: string;
  userName: string;
  notes?: string;
  jobNumber?: string;
  outlet?: string;
  location?: string;
  inventoryType?: 'Warehouse Stock' | 'Client Stock';
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  imageUrl?: string;
  createdAt: number;
  likes: string[]; // List of user IDs
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isAi: boolean;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: number;
  isPublic?: boolean;
}

export interface ProjectItem {
  inventoryItemId: string;
  name: string;
  brand: string;
  model: string;
  quantity: number;
  supplier: string;
  location?: string;
  quantityIn?: number;
  quantityOut?: number;
}

export interface Project {
  id: string;
  client: string;
  jobNumber: string;
  outlet: string;
  location?: string;
  totalQuantityIn?: number;
  totalQuantityOut?: number;
  status: 'Active' | 'Completed' | 'Draft';
  items: ProjectItem[];
  createdAt: number;
  updatedAt: number;
  userId: string;
}
