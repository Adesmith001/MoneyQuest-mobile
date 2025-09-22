import { ImageSourcePropType } from 'react-native';

// Define the avatar data in one central place
export const avatars = [
    { id: 'avatar1', image: require('../../assets/avatar1.png') },
    { id: 'avatar2', image: require('../../assets/avatar2.png') },
    { id: 'avatar3', image: require('../../assets/avatar3.png') },
    { id: 'avatar4', image: require('../../assets/avatar4.png') },
    { id: 'avatar5', image: require('../../assets/avatar5.png') },
    { id: 'avatar6', image: require('../../assets/avatar6.png') },
    { id: 'avatar7', image: require('../../assets/avatar7.png') },
    { id: 'avatar8', image: require('../../assets/avatar8.png') },
    { id: 'avatar9', image: require('../../assets/avatar9.png') },
    { id: 'avatar10', image: require('../../assets/avatar10.png') },
];

// Default placeholder image
const defaultAvatar = require('../../assets/avatar1.png');

/**
 * Helper function to get an avatar image source by its ID.
 * @param avatarId The ID of the avatar (e.g., 'avatar1').
 * @returns The require() source for the image.
 */
export const getAvatarById = (avatarId?: string): ImageSourcePropType => {
    if (!avatarId) {
        return defaultAvatar;
    }
    const avatar = avatars.find(a => a.id === avatarId);
    return avatar ? avatar.image : defaultAvatar;
};