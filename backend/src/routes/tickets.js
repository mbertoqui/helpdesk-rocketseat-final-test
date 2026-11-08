const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Listar chamados
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let where = {};

    // Filtrar por role do usuário
    if (req.user.role === 'CLIENT') {
      where.clientId = req.user.id;
    } else if (req.user.role === 'TECHNICIAN') {
      where.technicianId = req.user.id;
    }
    // Admin vê todos os chamados

    // Filtrar por status se fornecido
    if (status) {
      where.status = status;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        ticketServices: {
          include: {
            service: true
          }
        }
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.ticket.count({ where });

    res.json({
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar chamados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar chamado por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true
          }
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            availableHours: true
          }
        },
        ticketServices: {
          include: {
            service: true
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Verificar permissões
    if (req.user.role === 'CLIENT' && ticket.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (req.user.role === 'TECHNICIAN' && ticket.technicianId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    res.json({ ticket });
  } catch (error) {
    console.error('Erro ao buscar chamado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar chamado (Cliente)
router.post('/', [
  authenticateToken,
  authorizeRoles('CLIENT'),
  body('title').notEmpty().withMessage('Título é obrigatório'),
  body('description').notEmpty().withMessage('Descrição é obrigatória'),
  body('technicianId').notEmpty().withMessage('Técnico é obrigatório'),
  body('services').isArray({ min: 1 }).withMessage('Pelo menos um serviço deve ser selecionado'),
  body('services.*.serviceId').notEmpty().withMessage('ID do serviço é obrigatório'),
  body('services.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantidade deve ser um número inteiro positivo')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, technicianId, services } = req.body;

    // Verificar se técnico existe e está ativo
    const technician = await prisma.user.findUnique({
      where: { id: technicianId }
    });

    if (!technician || technician.role !== 'TECHNICIAN' || !technician.isActive) {
      return res.status(400).json({ error: 'Técnico inválido' });
    }

    // Verificar se todos os serviços existem e estão ativos
    const serviceIds = services.map(s => s.serviceId);
    const validServices = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        isActive: true
      }
    });

    if (validServices.length !== serviceIds.length) {
      return res.status(400).json({ error: 'Um ou mais serviços são inválidos' });
    }

    // Calcular preço total
    let totalPrice = 0;
    const ticketServicesData = services.map(serviceItem => {
      const service = validServices.find(s => s.id === serviceItem.serviceId);
      const quantity = serviceItem.quantity || 1;
      const price = service.price * quantity;
      totalPrice += price;

      return {
        serviceId: serviceItem.serviceId,
        quantity,
        price: service.price
      };
    });

    // Criar chamado com serviços
    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        clientId: req.user.id,
        technicianId,
        totalPrice,
        ticketServices: {
          create: ticketServicesData
        }
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        ticketServices: {
          include: {
            service: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Chamado criado com sucesso',
      ticket
    });
  } catch (error) {
    console.error('Erro ao criar chamado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar status do chamado (Admin e Técnico)
router.patch('/:id/status', [
  authenticateToken,
  authorizeRoles('ADMIN', 'TECHNICIAN'),
  body('status').isIn(['OPEN', 'IN_PROGRESS', 'CLOSED']).withMessage('Status inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Buscar chamado
    const ticket = await prisma.ticket.findUnique({
      where: { id }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Verificar permissões para técnico
    if (req.user.role === 'TECHNICIAN' && ticket.technicianId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Atualizar status
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: { status },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        ticketServices: {
          include: {
            service: true
          }
        }
      }
    });

    res.json({
      message: 'Status do chamado atualizado com sucesso',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Erro ao atualizar status do chamado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar serviço ao chamado (Técnico)
router.post('/:id/services', [
  authenticateToken,
  authorizeRoles('TECHNICIAN'),
  body('serviceId').notEmpty().withMessage('ID do serviço é obrigatório'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantidade deve ser um número inteiro positivo')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { serviceId, quantity = 1 } = req.body;

    // Buscar chamado
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        ticketServices: true
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Verificar se é o técnico responsável
    if (ticket.technicianId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se serviço existe e está ativo
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!service || !service.isActive) {
      return res.status(400).json({ error: 'Serviço inválido' });
    }

    // Verificar se serviço já foi adicionado ao chamado
    const existingTicketService = ticket.ticketServices.find(ts => ts.serviceId === serviceId);
    if (existingTicketService) {
      return res.status(400).json({ error: 'Serviço já foi adicionado a este chamado' });
    }

    // Adicionar serviço ao chamado
    const ticketService = await prisma.ticketService.create({
      data: {
        ticketId: id,
        serviceId,
        quantity,
        price: service.price
      }
    });

    // Recalcular preço total do chamado
    const allTicketServices = await prisma.ticketService.findMany({
      where: { ticketId: id },
      include: { service: true }
    });

    const newTotalPrice = allTicketServices.reduce((total, ts) => {
      return total + (ts.price * ts.quantity);
    }, 0);

    // Atualizar preço total do chamado
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: { totalPrice: newTotalPrice },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        ticketServices: {
          include: {
            service: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Serviço adicionado ao chamado com sucesso',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Erro ao adicionar serviço ao chamado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover serviço do chamado (Técnico)
router.delete('/:id/services/:serviceId', authenticateToken, authorizeRoles('TECHNICIAN'), async (req, res) => {
  try {
    const { id, serviceId } = req.params;

    // Buscar chamado
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        ticketServices: true
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Verificar se é o técnico responsável
    if (ticket.technicianId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se o chamado tem mais de um serviço
    if (ticket.ticketServices.length <= 1) {
      return res.status(400).json({ error: 'Chamado deve ter pelo menos um serviço' });
    }

    // Buscar e remover o serviço do chamado
    const ticketService = await prisma.ticketService.findFirst({
      where: {
        ticketId: id,
        serviceId
      }
    });

    if (!ticketService) {
      return res.status(404).json({ error: 'Serviço não encontrado neste chamado' });
    }

    await prisma.ticketService.delete({
      where: { id: ticketService.id }
    });

    // Recalcular preço total do chamado
    const remainingTicketServices = await prisma.ticketService.findMany({
      where: { ticketId: id }
    });

    const newTotalPrice = remainingTicketServices.reduce((total, ts) => {
      return total + (ts.price * ts.quantity);
    }, 0);

    // Atualizar preço total do chamado
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: { totalPrice: newTotalPrice },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        ticketServices: {
          include: {
            service: true
          }
        }
      }
    });

    res.json({
      message: 'Serviço removido do chamado com sucesso',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Erro ao remover serviço do chamado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;

