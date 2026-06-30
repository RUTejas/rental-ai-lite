import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const owners = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true, name: true, email: true, propertiesOwned: { select: { name: true }, take: 2 } },
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ owners: owners.map(({ propertiesOwned, ...owner }) => ({ ...owner, properties: propertiesOwned.map((item) => item.name) })) });
}
