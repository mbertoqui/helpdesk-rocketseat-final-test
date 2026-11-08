import { useState, useEffect } from 'react';
import { Users, Ticket, Wrench, Shield, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTickets: 0,
    totalServices: 0,
    totalTechnicians: 0,
    ticketsByStatus: {
      open: 0,
      inProgress: 0,
      closed: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Buscar estatísticas de diferentes endpoints
      const [usersResponse, ticketsResponse, servicesResponse] = await Promise.all([
        api.get('/users'),
        api.get('/tickets'),
        api.get('/services')
      ]);

      const users = usersResponse.data.users;
      const tickets = ticketsResponse.data.tickets;
      const services = servicesResponse.data.services;

      // Calcular estatísticas
      const technicians = users.filter(user => user.role === 'TECHNICIAN');
      const ticketsByStatus = tickets.reduce((acc, ticket) => {
        if (ticket.status === 'OPEN') acc.open++;
        else if (ticket.status === 'IN_PROGRESS') acc.inProgress++;
        else if (ticket.status === 'CLOSED') acc.closed++;
        return acc;
      }, { open: 0, inProgress: 0, closed: 0 });

      setStats({
        totalUsers: users.length,
        totalTickets: tickets.length,
        totalServices: services.length,
        totalTechnicians: technicians.length,
        ticketsByStatus
      });
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Painel Administrativo
        </h1>
        <p className="text-gray-600">
          Olá, {user?.name}! Visão geral do sistema HelpDesk
        </p>
      </div>

      {/* Estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Incluindo admins, técnicos e clientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Chamados</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              Todos os chamados do sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Técnicos Ativos</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTechnicians}</div>
            <p className="text-xs text-muted-foreground">
              Técnicos disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviços Disponíveis</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalServices}</div>
            <p className="text-xs text-muted-foreground">
              Serviços cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas de chamados por status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chamados Abertos</CardTitle>
            <div className="w-3 h-3 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.ticketsByStatus.open}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando atendimento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.ticketsByStatus.inProgress}
            </div>
            <p className="text-xs text-muted-foreground">
              Sendo atendidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encerrados</CardTitle>
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.ticketsByStatus.closed}
            </div>
            <p className="text-xs text-muted-foreground">
              Finalizados com sucesso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesso rápido às principais funcionalidades administrativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <Users className="w-8 h-8 text-blue-600 mb-2" />
              <h3 className="font-medium">Gerenciar Usuários</h3>
              <p className="text-sm text-gray-500">Criar e editar técnicos e clientes</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <Ticket className="w-8 h-8 text-green-600 mb-2" />
              <h3 className="font-medium">Ver Chamados</h3>
              <p className="text-sm text-gray-500">Monitorar todos os chamados</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <Wrench className="w-8 h-8 text-purple-600 mb-2" />
              <h3 className="font-medium">Gerenciar Serviços</h3>
              <p className="text-sm text-gray-500">Adicionar e editar serviços</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <TrendingUp className="w-8 h-8 text-orange-600 mb-2" />
              <h3 className="font-medium">Relatórios</h3>
              <p className="text-sm text-gray-500">Análises e métricas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

