import { NotFoundError } from "../../utils/validation/errors";
import { profileRepository } from "./profile.repository";
import type { UpdateProfileInput } from "./profile.types";

export const profileService = {
  async getProfile(userId: string) {
    const profile = await profileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError("Profile not found");
    return profile;
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    // Strip undefined keys so a partial update doesn't null out existing fields.
    const data = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
    return profileRepository.upsert(userId, data);
  },
};
