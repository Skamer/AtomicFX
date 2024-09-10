import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { extractId } from "../utils";
import prisma from "../services/prisma";
import { Sound } from "@prisma/client";

const createCommandData = () => {
  const commandData = new SlashCommandBuilder();
  commandData.setName("soundboard");
  commandData.setDescription("Get a menu of sounds with buttons to play them");

  for (let i = 1; i <= 25; i++) {
    commandData.addStringOption((option) =>
      option
        .setName(`sound_${i}`)
        .setDescription(`The sound name for button ${i}`)
        .setRequired(i === 1 ? true : false)
        .setAutocomplete(true)
    );
  }

  return commandData;
};

export default {
  data: createCommandData(),
  async execute(interaction: ChatInputCommandInteraction) {
    const options = interaction.options;

    const rows = [];
    let row = new ActionRowBuilder();

    rows.push(row);

    let componentIndex = 0;
    for (let option of options.data) {
      const value = option.value as string;
      const id = extractId(value);
      const sound = isNaN(id)
        ? await prisma.sound.findFirst({ where: { name: value } })
        : await prisma.sound.findUnique({ where: { id } });

      if (sound) {
        const button = new ButtonBuilder();
        button.setCustomId(
          JSON.stringify({ type: "play", id: sound.id } as PlayButtonBehaviorData)
        );
        button.setLabel(sound.name);
        button.setStyle(ButtonStyle.Primary);

        if (componentIndex > 0 && componentIndex % 5 == 0) {
          row = new ActionRowBuilder();
          rows.push(row);
        }

        row.addComponents(button);
        componentIndex++;
      }
    }

    // @ts-ignore
    await interaction.reply({ components: [...rows] });
  },
  async autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const sounds = await prisma.sound.findMany({
      take: 25,
      where: { name: { startsWith: focusedValue, mode: "insensitive" } },
    });

    await interaction.respond(
      sounds.map((sound) => ({ name: sound.name, value: `id:${sound.id}` }))
    );
  },
};
