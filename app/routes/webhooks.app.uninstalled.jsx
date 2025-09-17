// WEBHOOK ODINSTALOWANIA APLIKACJI
import { authenticate } from "../shopify.server";
import db from "../db.server";

// OBSLUGA WEBHOOKA ODINSTALOWANIA APLIKACJI
export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  // console.log(`Received ${topic} webhook for ${shop}`);

  // WEBHOOK MOZE BYC WYWOLANY WIELOKROTNIE I PO ODINSTALOWANIU
  // JESLI WEBHOOK JUZ ZOSTAL WYKONANY, SESJA MOGLA BYC USUNIETA
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
