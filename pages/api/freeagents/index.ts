import { getMySession } from "lib/getMySession";
import { freeAgentPostSchema } from "lib/validators/fapost";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "prisma/client";

const freeAgentsHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.method) {
    case "PUT":
      await putHandler(req, res);
      break;
    case "DELETE":
      await deleteHandler(req, res);
      break;
    default:
      res.status(405).end();
  }
};

async function putHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getMySession(req);

  if (!user) return res.status(401).end();
  const parsed = freeAgentPostSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).end();
  }

  await prisma.freeAgentPost.upsert({
    create: { ...parsed.data, user: { connect: { id: user.id } } },
    update: { ...parsed.data },
    where: { userId: user.id },
  });

  res.status(200).end();
}

async function deleteHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getMySession(req);

  if (!user) return res.status(401).end();

  await prisma.freeAgentPost.delete({ where: { userId: user.id } });

  res.status(200).end();
}

export default freeAgentsHandler;
