import {
  ChannelType,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  VoiceChannel,
  AutocompleteInteraction,
  ButtonInteraction,
} from "discord.js";
import { playSound } from "../services/sounds";
import prisma from "../services/prisma";

const extractId = (s: string): number => {
  if (s.startsWith("id:")) {
    return Number(s.substring(3));
  } else {
    return Number(s);
  }
};

export default {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a sound in your current voice channel")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("the name sound to play")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("the channel to play the sound")
        .addChannelTypes(ChannelType.GuildVoice)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("name");
    const optChannel = interaction.options.getChannel("channel") as VoiceChannel;
    const member = interaction.member as GuildMember;
    const guild = interaction.guild;

    const channel = optChannel ? optChannel : member.voice.channel;

    if (channel && guild && name) {
      const id = extractId(name);

      const sound = isNaN(id)
        ? await prisma.sound.findFirst({ where: { name } })
        : await prisma.sound.findUnique({ where: { id } });

      if (sound) {
        await playSound(`sound-${sound.id}`, channel, guild);
      }
    }

    await interaction.reply({ content: "Play the sound", ephemeral: true });
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

  async executeButton(interaction: ButtonInteraction, behaviorData: PlayButtonBehaviorData) {
    if (behaviorData.type !== "play") return;

    interaction.deferUpdate();

    // const id = extractId(variantId);
    const member = interaction.member as GuildMember;
    const guild = interaction.guild;
    const channel = member.voice.channel;

    if (!channel || !guild) return;

    const sound = await prisma.sound.findUnique({ where: { id: behaviorData.id } });

    if (sound) {
      playSound(`sound-${sound.id}`, channel, guild);
    }
  },
};
