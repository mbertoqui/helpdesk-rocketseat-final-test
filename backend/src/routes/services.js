const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Listar serviços ativos (todos os usuários autenticados)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { includeInactive = false } = req.query;
    
    const where = {};
    if (!includeInactive || req.user.role !== 'ADMIN') {
      where.isActive = true;
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    res.json({ services });
  } catch (error) {
    console.error('Erro ao listar serviços:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar serviço por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const service = await prisma.service.findUnique({
      where: { id }
    });

    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    // Se não for admin, só mostrar serviços ativos
    if (req.user.role !== 'ADMIN' && !service.isActive) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    res.json({ service });
  } catch (error) {
    console.error('Erro ao buscar serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar serviço (Admin)
router.post('/', [
  authenticateToken,
  authorizeRoles('ADMIN'),
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('description').optional().isString().withMessage('Descrição deve ser texto'),
  body('price').isNumeric().withMessage('Preço deve ser um número')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price } = req.body;

    // Verificar se já existe serviço com o mesmo nome
    const existingService = await prisma.service.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existingService) {
      return res.status(400).json({ error: 'Já existe um serviço com este nome' });
    }

    const service = await prisma.service.create({
      data: {
        name,
        description,
        price: parseFloat(price)
      }
    });

    res.status(201).json({
      message: 'Serviço criado com sucesso',
      service
    });
  } catch (error) {
    console.error('Erro ao criar serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar serviço (Admin)
router.put('/:id', [
  authenticateToken,
  authorizeRoles('ADMIN'),
  body('name').optional().notEmpty().withMessage('Nome não pode estar vazio'),
  body('description').optional().isString().withMessage('Descrição deve ser texto'),
  body('price').optional().isNumeric().withMessage('Preço deve ser um número'),
  body('isActive').optional().isBoolean().withMessage('isActive deve ser verdadeiro ou falso')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, price, isActive } = req.body;

    // Verificar se serviço existe
    const existingService = await prisma.service.findUnique({
      where: { id }
    });

    if (!existingService) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    // Se nome está sendo alterado, verificar se não está em uso
    if (name && name.toLowerCase() !== existingService.name.toLowerCase()) {
      const nameInUse = await prisma.service.findFirst({
        where: { 
          name: { equals: name, mode: 'insensitive' },
          id: { not: id }
        }
      });

      if (nameInUse) {
        return res.status(400).json({ error: 'Já existe um serviço com este nome' });
      }
    }

    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price && { price: parseFloat(price) }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({
      message: 'Serviço atualizado com sucesso',
      service: updatedService
    });
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Desativar serviço (Admin) - Soft delete
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se serviço existe
    const service = await prisma.service.findUnique({
      where: { id }
    });

    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    // Desativar serviço (soft delete)
    await prisma.service.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Serviço desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Reativar serviço (Admin)
router.patch('/:id/activate', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se serviço existe
    const service = await prisma.service.findUnique({
      where: { id }
    });

    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    // Reativar serviço
    const updatedService = await prisma.service.update({
      where: { id },
      data: { isActive: true }
    });

    res.json({
      message: 'Serviço reativado com sucesso',
      service: updatedService
    });
  } catch (error) {
    console.error('Erro ao reativar serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;

