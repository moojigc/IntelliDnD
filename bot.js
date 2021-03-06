const { Client, MessageEmbed } = require("discord.js"),
	moment = require("moment"),
	{ Player, Guild } = require("./models"),
	{ connect } = require("mongoose"),
	client = new Client({ disableMentions: "everyone" }),
	MONGODB_URI = process.env.MONGODB_URI || require("./private.json").dev.MONGODB_URI,
	BOT_TOKEN = process.env.BOT_TOKEN || require("./private.json").BOT_TOKEN;

connect(MONGODB_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useCreateIndex: true
}).catch(console.error);

client.once("ready", async () => {
	console.log(`${client.user.username} is ready!`);
	try {
		let link = await client.generateInvite([
			"MANAGE_MESSAGES",
			"SEND_MESSAGES",
			"READ_MESSAGE_HISTORY",
			"EMBED_LINKS"
		]);
		console.log(link);
	} catch (e) {
		console.log(e.stack);
	}
});

client.on("guildCreate", async (guild) => {
	try {
		let [defaultChannel] = guild.channels.cache.filter((channel) => {
			if (channel.type == "text" && channel.permissionsFor(guild.me).has("SEND_MESSAGES"))
				return true;
			else return false;
		});
		defaultChannel[1].send("Hello! To see a list of commands, run **/intellidnd**.");
	} catch (error) {
		console.log(error);
	}
});

client.on("message", async (message) => {
	try {
		if (message.channel.type === "dm" && !message.author.bot) {
			const regexTest = /stupid|bad|bot/.test(message.content);
			message.author
				.send(
					regexTest
						? `:poop:僕は悪いボットではないよ！`
						: `Messages to this bot are not monitored. If you have any issues or feature requests, please go to https://github.com/moojigc/DiscordBot/issues.`
				)
				.catch(console.error);
			return;
		}
		if (message.author.bot) return;
		if ((process.env.PORT && message.guild.name === "Bot Testing") || message.author.bot)
			return;
		if (!message.channel.permissionsFor(message.guild.me).has("SEND_MESSAGES")) return;
		if (message.content.split("")[0] !== "/") return;
		const isValid = (input) => {
			let commands = /stat|dice|d|login|inventory|inv|wallet|create|deleteplayer|intellidnd|add|remove|overwrite|changelog|dm/;
			return input.match(commands);
		};
		const messageArr = message.content.toLowerCase().split(" "),
			command = messageArr[0].split("").slice(1).join(""),
			commandKeywords = messageArr.slice(1); // used by the if statement
		// End whole script if no valid command entered
		if (!isValid(command)) return;
		const { createResponseEmbed } = require("./utils/globalFunctions.js")(message);

		const checkMentionsAndPermissions = () => {
			// Check whether acting upon author of the message or a mentioned user, or @ everyone
			if (message.mentions.users.array().length > 0 || message.mentions.everyone) {
				const nullObject = { id: null, displayName: "@everyone" }; // Prevents errors when getting the inventory of @everyone
				if (
					!message.member.hasPermission("BAN_MEMBERS") ||
					!message.member.hasPermission("KICK_MEMBERS")
				) {
					createResponseEmbed(
						"channel",
						"invalid",
						`User <@${message.author.id}> does not have sufficient privileges for this action.`
					);
					return {
						args: [""],
						recipientPlayer: message.member,
						insufficientPerms: true
					};
				} else {
					return {
						args: commandKeywords.slice(1), // accounts for @mention being the 2nd word in the message
						recipientPlayer:
							commandKeywords[0] === "@everyone"
								? nullObject
								: message.mentions.members.first()
					};
				}
			} else {
				return {
					args: commandKeywords.slice(0),
					recipientPlayer: message.member // all commands will be carried out on the author of the message
				};
			}
		};

		const { args, recipientPlayer, insufficientPerms } = checkMentionsAndPermissions();
		if (insufficientPerms) return;
		let currentGuild = await Guild.findOne({ discordId: message.guild.id });
		let currentPlayer = await Player.findOne({
			discordId: recipientPlayer.id + message.guild.id
		});
		// commands usable by anyone
		const allUserCommands = (input) => /create|intellidnd|dice|d/.test(input);
		if (
			!currentPlayer &&
			!allUserCommands(command) &&
			recipientPlayer.displayName !== "@everyone"
		)
			return createResponseEmbed(
				"channel",
				"invalid",
				`No data for ${recipientPlayer.displayName}. Run /create to start an inventory for this player.`
			);
		// Auto change names
		if (currentPlayer && currentPlayer.name !== recipientPlayer.displayName) {
			currentPlayer.name = recipientPlayer.displayName;
			Player.updateOne({ name: recipientPlayer.displayName });
		}
		switch (command) {
			case `inv`:
			case `inventory`:
				{
					const { showInventory } = require("./commands/inv_wallet")(message);
					showInventory(currentPlayer, currentGuild);
				}

				break;
			case `wallet`:
				{
					const { showWallet } = require("./commands/inv_wallet")(message);
					showWallet(currentPlayer, currentGuild);
				}

				break;
			case `add`:
				{
					const { add } = require("./commands/add");
					currentPlayer.updateOne({
						inventory: add(message, args, currentPlayer).inventory,
						changelog: currentPlayer.writeChangelog(message.content),
						lastUpdated: Date.now()
					});
				}

				break;
			case `remove`:
				{
					const removeItem = require("./commands/remove");
					removeItem(message, args, currentPlayer);
				}

				break;
			case `overwrite`:
				{
					const overwrite = require("./commands/overwrite");
					overwrite(message, args, currentPlayer);
				}

				break;
			case `create`:
				{
					const create = require("./commands/create");
					create({
						createResponseEmbed: createResponseEmbed,
						Player: Player,
						Guild: Guild,
						currentGuild: currentGuild,
						currentPlayer: currentPlayer,
						args: args,
						recipientPlayer: recipientPlayer,
						message: message
					});
				}

				break;
			case `deleteplayer`:
				{
					await currentPlayer.remove();
					createResponseEmbed(
						"channel",
						"success",
						`Player ${recipientPlayer.displayName}'s inventory successfully deleted.`
					);
				}

				break;
			case `dm`:
				{
					const dm = require("./commands/dm");
					dm(message, currentPlayer);
				}

				break;
			case `helpinventory`:
			case `intellidnd`:
				{
					const help = require("./commands/help");
					help(message);
				}
				break;
			case `changelog`:
				{
					const changelog = require("./commands/changelog");
					changelog(message, currentPlayer, moment);
				}
				break;

			case `login`:
				{
					const webLogin = require("./commands/login");
					webLogin(message, currentPlayer);
				}
				break;
			case `d`:
			case `dice`:
				{
					const { roll } = require("./commands/roll");
					roll({
						message: message,
						player: currentPlayer,
						discordMember: recipientPlayer,
						args: args
					});
				}
				break;
			case `stat`:
				{
					const setStats = require("./commands/setStats");
					setStats(message, args, currentPlayer);
				}
				break;
			default:
				// Keep blank so the bot doesn't interfere with other bots
				return;
		}
	} catch (err) {
		console.trace(err);
		let errorEmbed = new MessageEmbed()
			.setColor("RED")
			.setTitle(`Something went wrong!`)
			.setDescription(
				`Hi **${message.author.username}**, 
            You tried to execute: \`${message}\` but it returned the following error.`
			)
			.addField(
				"Problem:",
				`\`${err}\`.
            If you did not get any other error messages describing the issue in plain English, please submit this one to the [bot's GitHub repo](https://github.com/moojigc/DiscordBot/issues).`
			)
			.addField("At:", moment().format("MMMM Do, hh:mm a"));

		if (!message.author.bot) message.author.send(errorEmbed);
	}
});
// end of client.on('message)
client.login(BOT_TOKEN);
