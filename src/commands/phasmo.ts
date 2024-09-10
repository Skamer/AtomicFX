import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { getRollImage } from "../services/phasmo";

export default {
  data: new SlashCommandBuilder()
    .setName("phasmo")
    .setDescription("Do some tasks relative to phasmophobia")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("roll")
        .setDescription("Roll a map with random settings for a victim")
        .addUserOption((option) =>
          option.setName("user").setDescription("The user used in the roll").setRequired(false)
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (interaction.options.getSubcommand() == "roll") {
      let user = interaction.options.getUser("user");

      if (!user) {
        user = interaction.user;
      }

      const img = await getRollImage(user);
      interaction.reply({ files: [img] });
    }
  },
};
