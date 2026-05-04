export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'user';
  isApproved: boolean;
  createdAt: any;
}

export interface ApprovedEmail {
  id: string;
  email: string;
  addedBy: string;
  createdAt: any;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  location: string;
  currentQuantity: number;
  minStock: number;
  imageUrl?: string;
  lastUpdated: any;
  jobNumber?: string;
  client?: string;
  stockInDate?: any;
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
  brand?: string;
  modelNumber?: string;
  type: 'IN' | 'OUT';
  quantity: number;
  client: string;
  date: any;
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
  createdAt: any;
  likes: string[]; // List of user IDs
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: any;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isAi: boolean;
  createdAt: any;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: any;
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
  createdAt: any;
  updatedAt: any;
  userId: string;
}
