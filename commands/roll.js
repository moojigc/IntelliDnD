// @ts-check
const dexRolls = /acrobatics|stealth|sleight\s?of\s?hand/i;
const wisRolls = /animal\s?handling|insight|medicine|perception|survival/i;
const intRolls = /arcana|history|nature|religion/i;
const chaRolls = /deception|intimidation|performance|persuasion/i;
const strRolls = /athletics/i;
/**
 * Do a roll!
 * @param {import("discord.js").Message} message
 * @param {import("../models/Player")} player
 * @param {import("discord.js").GuildMember | { id: string, displayName: string }} discordMember
 * @param {string[]} args
 */
const roll = async (message, player, discordMember, args) => {
	// const isSavedRoll = (input) =>
	// 	dexRolls.test(input) ||
	// 	wisRolls.test(input) ||
	// 	intRolls.test(input) ||
	// 	chaRolls.test(input) ||
	// 	strRolls.test(input);
	// switch (isSavedRoll(args)) {
	// 	case true:
	// 		{
	// 			console.log(true);
	// 		}
	// 		break;
	// 	case false:
	// 		{
	// 			console.log(false);
	// 		}
	// 		break;
	// }
	/**
	 * Using regexes, this deconstructs the roll, modifiers and roll label from user input
	 * @param {string[]} args
	 */
	const getRollDetails = (args) => {
		let stringified = args.slice(0).join(" ");
		// Split the string starting from first character matching either a number or the letter d, and then
		// set delimiter to + OR -, and include them in the result
		let rolls = stringified.substring(stringified.search(/[0-9]|d/i)).split(/(?=-)|(?=\+)/);
		// This regex checks for a string in the format of an
		let rollRegex = /(\d+)?d\d+/i;
		return {
			modifiers: rolls
				// @ts-ignore
				.filter((r) => !r.match(rollRegex) && !isNaN(r))
				.map((r) => parseInt(r)),
			rolls: rolls
				.map((r) => {
					let match = r.match(rollRegex);
					return match ? match[0] : null;
				})
				.filter((r) => !!r),
			rollName: stringified.split(/#/)[1]
		};
	};
	let { rollName, rolls, modifiers } = getRollDetails(args);

	// Ends func if no rolls, usually as a result of user inputting wrong syntax and regexes failed
	if (rolls.length === 0) return message.channel.send(":poop:");

	let totalRaw = rolls
		.map((roll) => {
			// If user types in 1d20, then dice = 1 and sides = 20
			let [dice, sides] = roll.split("d").map((r) => (r ? parseInt(r) : 1));
			// Returns a random roll with any amount of dice
			let totalRolls = [];
			for (let i = 0; i < dice; i++) {
				totalRolls.push(Math.floor(Math.random() * sides + 1));
			}
			return totalRolls;
		})
		.reduce((prev, curr) => {
			return prev.concat(curr);
		}, []);

	// Returns a formatted string
	const reply = () => {
		let readableModifiers = modifiers.map((m) => (m > 0 ? `+${m}` : m));
		let readableModifiers2 = modifiers.map((m) => (m > 0 ? `+ ${m} ` : `- ${m * -1} `));
		if (modifiers.length > 0) {
			return (
				`\`${rolls.join("+")}${readableModifiers.join("")}${rollName ? " #" + rollName : ""}\`: (` +
				totalRaw.join(" + ") +
				`) ${readableModifiers2.join("")} ` +
				`= **${totalRaw.reduce((pv, cv) => pv + cv, 0) + modifiers.reduce((pv, cv) => pv + cv, 0)}**`
			);
		} else if (totalRaw.length > 1 && modifiers.length === 0) {
			return (
				`\`${rolls.join("+")}${rollName ? " #" + rollName : ""}\`: (` +
				totalRaw.join(" + ") +
				`) = **${totalRaw.reduce((pv, cv) => pv + cv, 0)}**`
			);
		} else {
			return `\`${rolls[0]}${rollName ? " #" + rollName : ""}\`: **${totalRaw[0]}**`;
		}
	};
	if (args.join(" ").match(/-s/i)) return message.channel.send(`<@${discordMember.id}>: ${totalRaw.reduce((pv, cv) => pv + cv, 0)}`);
	else return message.channel.send(`<@${discordMember.id}> rolled ${reply()}!`);
};

module.exports = roll;