const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes
  await prisma.ticketService.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  // Criar usuário administrador
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@helpdesk.com',
      password: adminPassword,
      name: 'Administrador',
      role: 'ADMIN'
    }
  });
  console.log('✅ Administrador criado:', admin.email);

  // Criar técnicos
  const technicians = [
    {
      email: 'tecnico1@helpdesk.com',
      name: 'João Silva',
      phone: '(11) 99999-1111',
      availableHours: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
    },
    {
      email: 'tecnico2@helpdesk.com',
      name: 'Maria Santos',
      phone: '(11) 99999-2222',
      availableHours: ['10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00', '19:00']
    },
    {
      email: 'tecnico3@helpdesk.com',
      name: 'Pedro Costa',
      phone: '(11) 99999-3333',
      availableHours: ['12:00', '13:00', '14:00', '15:00', '18:00', '19:00', '20:00', '21:00']
    }
  ];

  for (const techData of technicians) {
    const techPassword = await bcrypt.hash('tecnico123', 12);
    const technician = await prisma.user.create({
      data: {
        ...techData,
        password: techPassword,
        role: 'TECHNICIAN'
      }
    });
    console.log('✅ Técnico criado:', technician.email);
  }

  // Criar serviços
  const services = [
    {
      name: 'Instalação e atualização de softwares',
      description: 'Instalação, configuração e atualização de programas e aplicativos',
      price: 80.00
    },
    {
      name: 'Instalação e atualização de hardwares',
      description: 'Instalação e configuração de componentes físicos do computador',
      price: 120.00
    },
    {
      name: 'Diagnóstico e remoção de vírus',
      description: 'Análise completa do sistema e remoção de malwares e vírus',
      price: 100.00
    },
    {
      name: 'Solução de problemas de conectividade de internet',
      description: 'Diagnóstico e correção de problemas de conexão com a internet',
      price: 90.00
    },
    {
      name: 'Backup e recuperação de dados',
      description: 'Criação de backups e recuperação de arquivos perdidos',
      price: 150.00
    },
    {
      name: 'Otimização de desempenho do sistema operacional',
      description: 'Limpeza e otimização do sistema para melhor performance',
      price: 70.00
    },
    {
      name: 'Configuração de VPN e Acesso Remoto',
      description: 'Configuração de redes privadas virtuais e acesso remoto seguro',
      price: 110.00
    }
  ];

  for (const serviceData of services) {
    const service = await prisma.service.create({
      data: serviceData
    });
    console.log('✅ Serviço criado:', service.name);
  }

  // Criar alguns clientes de exemplo
  const clients = [
    {
      email: 'cliente1@email.com',
      name: 'Ana Oliveira',
      phone: '(11) 88888-1111'
    },
    {
      email: 'cliente2@email.com',
      name: 'Carlos Ferreira',
      phone: '(11) 88888-2222'
    }
  ];

  for (const clientData of clients) {
    const clientPassword = await bcrypt.hash('cliente123', 12);
    const client = await prisma.user.create({
      data: {
        ...clientData,
        password: clientPassword,
        role: 'CLIENT'
      }
    });
    console.log('✅ Cliente criado:', client.email);
  }

  console.log('🎉 Seed concluído com sucesso!');
  console.log('\n📋 Credenciais de acesso:');
  console.log('👤 Admin: admin@helpdesk.com / admin123');
  console.log('🔧 Técnico 1: tecnico1@helpdesk.com / tecnico123');
  console.log('🔧 Técnico 2: tecnico2@helpdesk.com / tecnico123');
  console.log('🔧 Técnico 3: tecnico3@helpdesk.com / tecnico123');
  console.log('👥 Cliente 1: cliente1@email.com / cliente123');
  console.log('👥 Cliente 2: cliente2@email.com / cliente123');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

