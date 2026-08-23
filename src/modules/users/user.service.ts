import { NotFoundError } from "../../utils/validation/errors";
import { userRepository } from "./user.repository";

export const userService = {
  async search(query: string) {
    if (!query || query.trim().length < 2) return [];
    const users = await userRepository.searchByName(query.trim(), 10);
    return users.map((u) => ({ id: u.id, name: u.name, rating: u.rating, avatar: u.profile?.avatar ?? null }));
  },

  async getPublicProfile(userId: string) {
    const user = await userRepository.findPublicById(userId);
    if (!user) throw new NotFoundError("User not found");
    return user;
  },
};
