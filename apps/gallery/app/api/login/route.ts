import { NextResponse } from "next/server";
import { verifySecret, createGallerySession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const user = email && password
    ? await prisma.user.findFirst({
        where: { role: "CLIENT", email: { equals: email, mode: "insensitive" } },
        include: {
          clients: {
            include: {
              events: {
                where: { isPublished: true },
                orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }]
              }
            }
          }
        }
      })
    : null;

  const passwordMatches = Boolean(user?.passwordHash) && await verifySecret(password, user!.passwordHash!);
  const event = user?.clients.flatMap((client) => client.events)[0];

  if (!passwordMatches || !event) {
    return NextResponse.redirect(new URL("/client-login?error=credentials", request.url), 303);
  }

  await createGallerySession(event.id);
  return NextResponse.redirect(new URL(`/gallery/${event.slug}`, request.url), 303);
}
