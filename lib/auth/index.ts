import { auth } from "@clerk/nextjs/server";

export const getCurrentUser = async () => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
};