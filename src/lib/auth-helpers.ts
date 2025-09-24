
'use client';

// This function can be used on both client and server, so it doesn't have a 'use server' directive.

/**
 * Checks if a user ID is present in an access list.
 * The access list can be an array of numbers or strings.
 * @param accessList - The array of user IDs to check against.
 * @param userId - The ID of the user to check for.
 * @returns boolean - True if the user has access, false otherwise.
 */
export function hasUserAccess(
    accessList: (number | string | null | undefined)[] | null | undefined,
    userId: number,
): boolean {
    if (!Array.isArray(accessList)) {
        return false;
    }

    return accessList.some((value) => {
        if (typeof value === 'number') {
            return value === userId;
        }

        if (typeof value === 'string') {
            const parsed = Number.parseInt(value, 10);
            return Number.isInteger(parsed) && parsed === userId;
        }

        return false;
    });
}
