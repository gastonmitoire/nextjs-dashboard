import { sql } from "@vercel/postgres";
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
} from "./definitions";
import { formatCurrency } from "./utils";
import { Invoice, Prisma, Revenue } from "@prisma/client";
import prisma from "./prisma";

export async function fetchRevenue(): Promise<Revenue[]> {
  try {
    console.log("Fetching revenue data...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const response: Revenue[] = await prisma.revenue.findMany();

    console.log("Data fetch completed after 3 seconds.");
    return response;
  } catch (error) {
    console.error("Failed to fetch revenues:", error);
    throw new Error("Failed to fetch revenues data.");
  }
}

export async function fetchLatestInvoices() {
  try {
    const response: InvoiceWithCustomer[] = await prisma.invoice.findMany({
      orderBy: {
        date: "desc",
      },
      take: 5,
      include: {
        customer: true,
      },
    });

    return response;
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    throw new Error("Failed to fetch invoices data.");
  }
}

export async function fetchCardData() {
  try {
    const [invoiceCount, customerCount, paidInvoices, pendingInvoices] =
      await Promise.all([
        prisma.invoice.count(),
        prisma.customer.count(),
        prisma.invoice.aggregate({
          _sum: {
            amount: true,
          },
          where: {
            status: "paid",
          },
        }),
        prisma.invoice.aggregate({
          _sum: {
            amount: true,
          },
          where: {
            status: "pending",
          },
        }),
      ]);

    const numberOfInvoices = invoiceCount ?? 0;
    const numberOfCustomers = customerCount ?? 0;
    const totalPaidInvoices = formatCurrency(paidInvoices._sum.amount ?? 0);
    const totalPendingInvoices = formatCurrency(
      pendingInvoices._sum.amount ?? 0
    );

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch card data.");
  }
}

const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(
  query: string,
  currentPage: number
): Promise<InvoiceWithCustomer[]> {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          {
            customer: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
          {
            customer: {
              email: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
          {
            amount: {
              equals: isNaN(Number(query)) ? undefined : Number(query),
            },
          },
          {
            date: {
              equals: isNaN(Date.parse(query)) ? undefined : new Date(query),
            },
          },
          {
            status: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      include: {
        customer: true,
      },
      orderBy: {
        date: "desc",
      },
      take: ITEMS_PER_PAGE,
      skip: offset,
    });
    console.log("Fetched Invoices:", invoices);

    return invoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const count = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoice.");
  }
}

export async function fetchCustomers() {
  try {
    const data = await sql<CustomerField>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch customer table.");
  }
}
