// Roles de usuario
export enum UserRole {
  Admin = 'admin',
  User = 'user',
  Viewer = 'viewer',
}

// Entidad principal de Usuario
export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Key del usuario
export interface ApiKey {
  id: number;
  userId: number;
  name: string;
  keyPrefix: string;                 // primeros 8 caracteres para identificación
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

// Payload del token JWT
export interface TokenPayload {
  userId: number;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
