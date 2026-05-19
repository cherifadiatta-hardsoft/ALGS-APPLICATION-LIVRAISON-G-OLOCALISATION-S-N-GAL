export interface Delivery {
  id: string;
  clientName: string;
  clientPhone: string;
  driverPhone: string;
  latitude: number;
  longitude: number;
  neighborhood: string;
  landmarkGuide: string;
  landmarkGuideWolof: string;
  status: 'pending' | 'shipping' | 'delivered';
  paymentStatus: 'pending' | 'completed';
  paymentMethod: 'wave' | 'orange_money' | 'free_money' | 'cash';
  createdAt: string;
  qrCodeToken: string;
  etaMinutes: number; // Simulated ETA for the live tracking
}

export interface WebhookLog {
  id: string;
  deliveryId: string;
  message: string;
  timestamp: string;
}
