// Ciclo de pago de una suscripción
export enum SubscriptionCycle {
  Semanal = 'Semanal',
  Mensual = 'Mensual',
}

// Estado de una suscripción
export enum SubscriptionStatus {
  Activa = 'Activa',
  Inactiva = 'Inactiva',
}

// Entidad principal de Suscripción
export interface Subscription {
  id: number;
  userId: number;
  name: string;                      // máximo 100 caracteres
  startDate: string;                 // fecha de inicio
  amount: number;                    // 0.01 a 999,999,999.99 MXN
  cycle: SubscriptionCycle;
  categoryId: number;
  accountId: number;                 // cuenta asociada
  status: SubscriptionStatus;        // Activa por defecto
  autoCharge: boolean;               // bandera de cargo automático
  nextPaymentDate: string | null;    // calculado
  daysRemaining: number | null;      // calculado: días hasta próximo pago (0 = hoy)
  lastPaymentDate: string | null;    // última fecha de pago registrada
  createdAt: string;
  updatedAt: string;
}
