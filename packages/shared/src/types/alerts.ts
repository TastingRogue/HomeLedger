// Tipos de alerta del sistema
export enum AlertType {
  BalanceBajo = 'BalanceBajo',
  UtilizacionAlta = 'UtilizacionAlta',
  PagoProximo = 'PagoProximo',
  PagoVencido = 'PagoVencido',
  MetaCumplida = 'MetaCumplida',
  PresupuestoExcedido = 'PresupuestoExcedido',
}

// Severidad de la alerta
export enum AlertSeverity {
  Info = 'Info',
  Warning = 'Warning',
  Critical = 'Critical',
}

// Entidad principal de Alerta
export interface Alert {
  id: number;
  userId: number;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  read: boolean;
  entityId: number | null;           // ID de la entidad relacionada (cuenta, suscripción, meta)
  entityType: string | null;         // tipo de entidad: 'account', 'subscription', 'goal'
  hash: string;                      // hash para deduplicación
  createdAt: string;
}

// Configuración de alertas del usuario
export interface AlertSettings {
  balanceLowEnabled: boolean;
  creditHighEnabled: boolean;
  paymentDueEnabled: boolean;
  paymentDueDays: number;            // días antes del pago para alertar (default: 3)
  goalCompletedEnabled: boolean;
  budgetThresholdEnabled: boolean;
}
