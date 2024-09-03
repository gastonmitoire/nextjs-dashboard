import { PrismaClient, Revenue, User } from "@prisma/client";
import bcrypt from "bcrypt";
import {
  customers as rawCustomers,
  invoices as rawInvoices,
  revenue,
  users,
} from "./placeholder-data";

const prisma = new PrismaClient();

// Función para hashear la contraseña
async function seedUsers(users: Omit<User, "id">[]) {
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
      },
    });
  }
}

// Función para agregar clientes
async function seedCustomers(
  customers: { id: string; name: string; email: string; imageUrl: string }[]
) {
  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { email: customer.email },
      update: {},
      create: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        imageUrl: customer.imageUrl, // Asegúrate de usar camelCase aquí
      },
    });
  }
}

// Función para agregar facturas
async function seedInvoices(
  invoices: {
    customerId: string;
    amount: number;
    status: string;
    date: string;
  }[]
) {
  for (const invoice of invoices) {
    await prisma.invoice.create({
      data: {
        customerId: invoice.customerId, // Asegúrate de usar camelCase aquí
        amount: invoice.amount,
        status: invoice.status,
        date: new Date(invoice.date), // Convertir la fecha a tipo Date
      },
    });
  }
}

// Función para agregar ingresos
async function seedRevenue(revenue: Revenue[]) {
  for (const rev of revenue) {
    await prisma.revenue.upsert({
      where: { month: rev.month },
      update: {},
      create: {
        month: rev.month,
        revenue: rev.revenue,
      },
    });
  }
}

// Función principal para ejecutar todos los seeders
async function main() {
  await seedUsers(users);

  const customers = rawCustomers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    imageUrl: customer.image_url, // Mapeo correcto de snake_case a camelCase
  }));
  await seedCustomers(customers);

  const invoices = rawInvoices.map((invoice) => ({
    customerId: invoice.customer_id, // Mapeo correcto de snake_case a camelCase
    amount: invoice.amount,
    status: invoice.status,
    date: invoice.date, // Se convierte a string y luego a Date en la función de seed
  }));
  await seedInvoices(invoices);

  await seedRevenue(revenue);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
