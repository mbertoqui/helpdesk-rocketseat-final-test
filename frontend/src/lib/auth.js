import api from './api';

// Serviços de autenticação
export const authService = {
  // Login
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    
    // Salvar no localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return { token, user };
  },

  // Registro de cliente
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    const { token, user } = response.data;
    
    // Salvar no localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return { token, user };
  },

  // Verificar token atual
  async me() {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  // Alterar senha
  async changePassword(currentPassword, newPassword) {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },

  // Logout
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Verificar se está logado
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  // Obter usuário atual
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Verificar role do usuário
  hasRole(role) {
    const user = this.getCurrentUser();
    return user?.role === role;
  },

  // Verificar se é admin
  isAdmin() {
    return this.hasRole('ADMIN');
  },

  // Verificar se é técnico
  isTechnician() {
    return this.hasRole('TECHNICIAN');
  },

  // Verificar se é cliente
  isClient() {
    return this.hasRole('CLIENT');
  }
};

export default authService;

