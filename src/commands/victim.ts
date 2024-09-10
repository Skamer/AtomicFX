import { ChatInputCommandInteraction, Guild, SlashCommandBuilder } from "discord.js";
import prisma from "../services/prisma";

const getVictimsText = (victims: string[], guild: Guild) => {
  let result = "";
  victims.forEach((victimId, index) => {
    const m = guild.members.cache.get(victimId);
    result += index === 0 ? `${m?.user.username}` : `, ${m?.user.username}`;
  });

  return result;
};

export default {
  data: new SlashCommandBuilder()
    .setName("victim")
    .setDescription("Set the victim")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add an user as victim")
        .addUserOption((option) =>
          option.setName("user").setDescription("the user to set as victim").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("clear").setDescription("Clear the victim list")
    )
    .addSubcommand((subcomannd) =>
      subcomannd.setName("list").setDescription("List the user considered as victim")
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (interaction.options.getSubcommand() == "add") {
      const user = interaction.options.getUser("user");
      const guild = interaction.guild;

      if (user && guild) {
        const server = await prisma.server.findUnique({ where: { id: guild.id } });

        if (server) {
          const hasUserId = user.id in server.victims;
          if (hasUserId) return;

          server.victims.push(user.id);

          await prisma.server.upsert({
            where: {
              id: guild.id,
            },
            update: {
              victims: server.victims,
            },
            create: {
              id: guild.id,
              victims: server.victims,
            },
          });

          await interaction.reply(
            `${user.username} has been added as victim.\n\nThe victims are now: ${getVictimsText(
              server.victims,
              guild
            )}`
          );
        }
      }
    } else if (interaction.options.getSubcommand() == "clear") {
      const guild = interaction.guild;

      if (guild) {
        await prisma.server.update({ data: { victims: [] }, where: { id: guild.id } });
      }

      await interaction.reply("Clear the victims list");
    } else if (interaction.options.getSubcommand() == "list") {
      const guild = interaction.guild;

      if (guild) {
        const server = await prisma.server.findUnique({ where: { id: guild.id } });

        if (server) {
          let result = getVictimsText(server.victims, guild);

          if (server.victims.length > 0) {
            await interaction.reply(`Victim(s): ${result}`);
          } else {
            await interaction.reply("Unfortunately, there are no victim !!!");
          }
        }
      }
    }

    await interaction.reply("Unfortunately my developper was afk for working on this feature");
  },
};
