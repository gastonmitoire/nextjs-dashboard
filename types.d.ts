type InvoiceWithCustomer = Prisma.InvoiceGetPayload<{
  include: { customer: true };
}>;
