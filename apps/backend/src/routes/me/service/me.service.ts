import { meRepository } from '../repository/me.repository.js';
import { aggregateTravelStats } from './aggregate-travel-stats.js';
import { NotFoundError } from '../../../utils/errors.js';
import type { MyProfileResponse, UpdateMyProfile } from '@staylark/contract';

export const meService = {
    getProfile: async (userId: string): Promise<MyProfileResponse> => {
        const fields = await meRepository.findProfileFields(userId);
        if (!fields) throw new NotFoundError('User not found');
        const stays = await meRepository.findStays(userId);
        return {
            profile: {
                bio: fields.bio,
                homeCity: fields.homeCity,
                languages: fields.languages,
                phone: fields.phone
            },
            stats: aggregateTravelStats(stays)
        };
    },

    updateProfile: async (userId: string, data: UpdateMyProfile) => {
        return meRepository.updateProfileFields(userId, data);
    }
};
