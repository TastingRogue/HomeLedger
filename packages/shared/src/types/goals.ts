// Tipo de meta de ahorro
export enum GoalType {
  ListaDeDeseos = 'Lista de Deseos',
  Deuda = 'Deuda',
}

// Estado de una meta
export enum GoalStatus {
  Activa = 'Activa',
  Completada = 'Completada',
}

// Entidad principal de Meta de Ahorro
export interface Goal {
  id: number;
  userId: number;
  name: string;                      // máximo 100 caracteres
  targetAmount: number;              // MX$0.01 a MX$999,999,999.99
  savedAmount: number;               // monto ahorrado actual (0 a targetAmount)
  type: GoalType;
  deadline: string | null;           // fecha límite opcional
  status: GoalStatus;                // Activa por defecto, Completada al alcanzar 100%
  progress: number;                  // calculado: (savedAmount / targetAmount) * 100, 0-100
  createdAt: string;
  updatedAt: string;
}
