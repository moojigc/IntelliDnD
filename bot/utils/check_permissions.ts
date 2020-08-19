import { Message } from 'discord.js';

/**
 * Check whether acting upon `author of the message`, a `mentioned user`, or `@everyone`
 */
const checkPermissions = (message: Message) => {
    let commandKeywords = message.content.toLowerCase().split(' ').slice(1);
    if (message.mentions.users.array().length > 0 || message.mentions.everyone) {
        // Prevents errors when getting the inventory of @everyone
        const nullObject = { id: (null as null | string), displayName: '@everyone' }; 
        if (
            !message.member.hasPermission('BAN_MEMBERS') ||
            !message.member.hasPermission('KICK_MEMBERS')
        ) {
            return {
                args: [''],
                recipientPlayer: message.member,
                insufficientPerms: true
            };
        } else {
            return {
                // accounts for @mention being the 2nd word in the message
                args: commandKeywords.slice(1), 
                recipientPlayer:
                    commandKeywords[0] === '@everyone'
                        ? nullObject
                        : message.mentions.members.first()
            };
        }
    } else {
        return {
            args: commandKeywords.slice(0),
            // all commands will be carried out on the author of the message
            recipientPlayer: message.member 
        };
    }
}

export default checkPermissions;