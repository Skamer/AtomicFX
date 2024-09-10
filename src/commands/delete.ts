import fs from "fs/promises";
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { extractId } from "../utils";
import prisma from "../services/prisma";

export default {
  data: new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Delete a sound")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("the sound name or id to delete")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const value = interaction.options.getString("name") as string;
    const id = extractId(value);

    const sound = isNaN(id)
      ? await prisma.sound.findFirst({ where: { name: value } })
      : await prisma.sound.findUnique({ where: { id } });

    if (sound) {
      await prisma.sound.delete({ where: { id: sound.id } });

      await fs.unlink(`/app/sounds/sound-${sound.id}`);

      await interaction.reply({
        content: `The sound (name: ${sound.name} ) with for id ${sound.id} has been deleted`,
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({ content: "The sound has not been found", ephemeral: true });
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused();
    const sounds = await prisma.sound.findMany();
    const filteredSounds = sounds.filter((sound) => sound.name.startsWith(focusedValue));

    await interaction.respond(
      filteredSounds.map((sound) => ({ name: sound.name, value: sound.id + "" }))
    );
  },
};
