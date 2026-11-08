import { useState, useEffect } from 'react';
import { Plus, Ticket, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const statusConfig = {
  OPEN: { label: 'Aberto', color: 'bg-blue-500', icon: AlertCircle },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-yellow-500', icon: Clock },
  CLOSED: { label: 'Encerrado', color: 'bg-green-500', icon: CheckCircle }
};

export default function ClientDashboard() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await api.get('/tickets');
      const ticketsData = response.data.tickets;
      setTickets(ticketsData);
      
      // Calcular estatísticas
      const stats = ticketsData.reduce((acc, ticket) => {
        acc.total++;
        if (ticket.status === 'OPEN') acc.open++;
        else if (ticket.status === 'IN_PROGRESS') acc.inProgress++;
        else if (ticket.status === 'CLOSED') acc.closed++;
        return acc;
      }, { total: 0, open: 0, inProgress: 0, closed: 0 });
      
      setStats(stats);
    } catch (error) {
      toast.error('Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR');
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Olá, {user?.name}!
          </h1>
          <p className="text-gray-600">
            Gerencie seus chamados de suporte técnico
          </p>
        </div>
        <Button onClick={() => navigate('/client/tickets/new')} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Chamado
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Chamados</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abertos</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encerrados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.closed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de chamados recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Chamados Recentes</CardTitle>
          <CardDescription>
            Seus últimos chamados de suporte
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Você ainda não tem chamados</p>
              <Button onClick={() => navigate('/client/tickets/new')}>
                Criar Primeiro Chamado
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.slice(0, 5).map((ticket) => {
                const StatusIcon = statusConfig[ticket.status].icon;
                return (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/client/tickets/${ticket.id}`)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${statusConfig[ticket.status].color}`} />
                      <div>
                        <h3 className="font-medium text-gray-900">{ticket.title}</h3>
                        <p className="text-sm text-gray-500">
                          Técnico: {ticket.technician.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(ticket.totalPrice)}</p>
                        <p className="text-xs text-gray-500">{formatDate(ticket.createdAt)}</p>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[ticket.status].label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              
              {tickets.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" onClick={() => navigate('/client/tickets')}>
                    Ver Todos os Chamados
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

