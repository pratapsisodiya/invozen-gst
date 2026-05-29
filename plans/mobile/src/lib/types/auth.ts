export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: 'owner' | 'admin' | 'accountant' | 'viewer'
  avatarInitials: string
  createdAt: string
}

export interface Session {
  user: User
  token: string
  expiresAt: string
}
