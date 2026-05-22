export type UserRole = 'owner' | 'admin' | 'accountant' | 'viewer' | 'ca'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  avatarInitials: string
  createdAt: string
}

export interface Session {
  user: User
  token: string
  expiresAt: string
}
