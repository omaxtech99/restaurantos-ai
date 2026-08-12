import { prisma } from "../src";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-bistro" },
    update: {},
    create: {
      name: "Demo Bistro",
      slug: "demo-bistro",
      users: {
        create: {
          email: "owner@demo-bistro.local",
          name: "Demo Owner",
        },
      },
    },
    include: { users: true },
  });

  console.log(`Seeded tenant: ${tenant.name} (${tenant.users.length} users)`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
