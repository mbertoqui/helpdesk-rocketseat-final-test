const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Configuração do multer para upload de avatares
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  }
});

// ROTAS PARA ADMIN

// Listar todos os usuários (Admin)
router.get('/', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        availableHours: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.user.count({ where });

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar técnico (Admin)
router.post('/technicians', [
  authenticateToken,
  authorizeRoles('ADMIN'),
  body('email').isEmail().withMessage('Email inválido'),
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('phone').optional().isMobilePhone('pt-BR').withMessage('Telefone inválido'),
  body('availableHours').isArray().withMessage('Horários disponíveis devem ser um array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, name, phone, availableHours } = req.body;

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }

    // Gerar senha provisória
    const provisionalPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(provisionalPassword, 12);

    // Criar técnico
    const technician = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        phone,
        role: 'TECHNICIAN',
        availableHours: availableHours || ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
      }
    });

    // Retornar dados do técnico (sem senha hash, mas com senha provisória para o admin)
    const { password: _, ...technicianData } = technician;

    res.status(201).json({
      message: 'Técnico criado com sucesso',
      technician: technicianData,
      provisionalPassword // Apenas para o admin repassar ao técnico
    });
  } catch (error) {
    console.error('Erro ao criar técnico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Editar usuário (Admin)
router.put('/:id', [
  authenticateToken,
  authorizeRoles('ADMIN'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('name').optional().notEmpty().withMessage('Nome não pode estar vazio'),
  body('phone').optional().isMobilePhone('pt-BR').withMessage('Telefone inválido'),
  body('availableHours').optional().isArray().withMessage('Horários disponíveis devem ser um array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { email, name, phone, availableHours, isActive } = req.body;

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Se email está sendo alterado, verificar se não está em uso
    if (email && email.toLowerCase() !== existingUser.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (emailInUse) {
        return res.status(400).json({ error: 'Email já está em uso' });
      }
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(email && { email: email.toLowerCase() }),
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(availableHours && { availableHours }),
        ...(isActive !== undefined && { isActive })
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        availableHours: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Usuário atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir cliente (Admin)
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se usuário existe e é cliente
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.role !== 'CLIENT') {
      return res.status(400).json({ error: 'Apenas clientes podem ser excluídos' });
    }

    // Excluir usuário (cascade irá excluir os chamados)
    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'Cliente excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ROTAS PARA USUÁRIOS AUTENTICADOS

// Atualizar próprio perfil
router.put('/profile/me', [
  authenticateToken,
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('name').optional().notEmpty().withMessage('Nome não pode estar vazio'),
  body('phone').optional().isMobilePhone('pt-BR').withMessage('Telefone inválido'),
  body('availableHours').optional().isArray().withMessage('Horários disponíveis devem ser um array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, name, phone, availableHours } = req.body;

    // Se email está sendo alterado, verificar se não está em uso
    if (email && email.toLowerCase() !== req.user.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (emailInUse) {
        return res.status(400).json({ error: 'Email já está em uso' });
      }
    }

    // Técnicos podem alterar horários disponíveis, clientes não
    const updateData = {
      ...(email && { email: email.toLowerCase() }),
      ...(name && { name }),
      ...(phone !== undefined && { phone })
    };

    if (req.user.role === 'TECHNICIAN' && availableHours) {
      updateData.availableHours = availableHours;
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        availableHours: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload de avatar
router.post('/profile/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const avatarPath = `/uploads/${req.file.filename}`;

    // Atualizar avatar do usuário
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarPath },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        availableHours: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Avatar atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erro ao fazer upload do avatar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir própria conta (apenas clientes)
router.delete('/profile/me', authenticateToken, authorizeRoles('CLIENT'), async (req, res) => {
  try {
    // Excluir usuário (cascade irá excluir os chamados)
    await prisma.user.delete({
      where: { id: req.user.id }
    });

    res.json({ message: 'Conta excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar técnicos disponíveis (para clientes criarem chamados)
router.get('/technicians/available', authenticateToken, async (req, res) => {
  try {
    const technicians = await prisma.user.findMany({
      where: {
        role: 'TECHNICIAN',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        availableHours: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({ technicians });
  } catch (error) {
    console.error('Erro ao listar técnicos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;

