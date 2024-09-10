import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import prisma from "../services/prisma";
import { Sound } from "@prisma/client";
import { isValidJSON } from "../utils";

const createSoundsEmbed = async (behaviorData: Omit<GetSoundsBehaviorData, "type">) => {
  const userId = behaviorData.userId;
  const postCount = userId
    ? await prisma.sound.count({ where: { uploaderId: userId } })
    : await prisma.sound.count();
  const postPerPage = 24;
  const pageCount = Math.ceil(postCount / postPerPage);
  let page = behaviorData.page || 1;

  const embed = new EmbedBuilder();
  embed.setColor(0x0099ff);
  embed.setTitle(userId ? "Your sounds" : "Server sounds");
  embed.setDescription(`**${postCount}** sounds:`);

  let row: ActionRowBuilder;

  if (page === "first") {
    page = 1;
  } else if (page === "last") {
    page = pageCount;
  }

  if (postCount > 0) {
    row = new ActionRowBuilder();

    let sounds: Sound[] = [];

    if (page == 1) {
      sounds = userId
        ? await prisma.sound.findMany({
            take: postPerPage,
            where: { uploaderId: userId },
            orderBy: { id: "asc" },
          })
        : await prisma.sound.findMany({ take: postPerPage, orderBy: { id: "asc" } });
    } else if (page == pageCount) {
      const lastSound = userId
        ? await prisma.sound.findFirst({ where: { uploaderId: userId }, orderBy: { id: "desc" } })
        : await prisma.sound.findFirst({ orderBy: { id: "desc" } });

      sounds = userId
        ? await prisma.sound.findMany({
            take: -(postCount % postPerPage),
            where: { uploaderId: userId },
            orderBy: { id: "asc" },
            cursor: { id: lastSound?.id },
          })
        : await prisma.sound.findMany({ take: -(postCount % postPerPage), orderBy: { id: "asc" } });
    } else {
      sounds = userId
        ? await prisma.sound.findMany({
            skip: 1,
            take: behaviorData.isPrevious ? -postPerPage : postPerPage,
            where: { uploaderId: userId },
            orderBy: { id: "asc" },
            cursor: { id: behaviorData.cursor },
          })
        : await prisma.sound.findMany({
            skip: 1,
            take: behaviorData.isPrevious ? -postPerPage : postPerPage,
            orderBy: { id: "asc" },
            cursor: { id: behaviorData.cursor },
          });
    }

    if (sounds) {
      sounds.forEach((sound) =>
        embed.addFields({ name: sound.name, value: `id: \`${sound.id}\``, inline: true })
      );

      if (sounds.length % 3 > 0) {
        for (let i = 0; i < 3 - (sounds.length % 3); i++) {
          embed.addFields({ name: "\u200b", value: "\u200b", inline: true });
        }
      }
    }

    const hasFirstPage = pageCount > 1 && page !== 1;
    const hasPreviousPage = pageCount > 1 && page - 1 >= 1;
    const hasNextPage = pageCount > 1 && page + 1 <= pageCount;
    const hasLastPage = pageCount > 1 && page !== pageCount;

    // In case where use the custom SQL
    //
    // const soundBounds = await prisma.$queryRaw<{ id: number }[]>`
    //   SELECT * FROM (
    //       (SELECT id FROM sounds ORDER BY id LIMIT 1)
    //     UNION ALL
    //       (SELECT id FROM sounds ORDER BY id DESC LIMIT 1)
    //   ) AS first_and_last;
    // `;
    //
    // const firstId = soundBounds.length >= 1 && soundBounds[0] ? soundBounds[0].id
    // const lastId =  soundBounds.length >= 2 && soundBounds[1] ? soundBounds[1].id
    //
    //

    const firstPageButton = new ButtonBuilder();
    firstPageButton.setCustomId(
      JSON.stringify({
        type: "getSounds",
        page: "first",
        userId,
        isFirst: true,
      } as GetSoundsBehaviorData)
    );
    firstPageButton.setLabel("\u200b");
    firstPageButton.setEmoji("⏮");
    firstPageButton.setDisabled(!hasFirstPage);
    firstPageButton.setStyle(ButtonStyle.Primary);
    row.addComponents(firstPageButton);

    const previousPageButton = new ButtonBuilder();
    previousPageButton.setCustomId(
      JSON.stringify({
        type: "getSounds",
        page: Math.max(page - 1, 1),
        userId,
        cursor: sounds.length >= 1 ? sounds[0].id : undefined,
        isPrevious: true,
      } as GetSoundsBehaviorData)
    );
    previousPageButton.setLabel("\u200b");
    previousPageButton.setEmoji("⏪");
    previousPageButton.setDisabled(!hasPreviousPage);
    previousPageButton.setStyle(ButtonStyle.Secondary);
    row.addComponents(previousPageButton);

    const currentPageButton = new ButtonBuilder();
    currentPageButton.setCustomId("none");
    currentPageButton.setLabel(`Page ${page}`);
    currentPageButton.setStyle(ButtonStyle.Success);
    row.addComponents(currentPageButton);

    const nextPage = new ButtonBuilder();
    nextPage.setCustomId(
      JSON.stringify({
        type: "getSounds",
        page: Math.min(page + 1, pageCount),
        cursor: sounds.length >= 1 ? sounds[sounds.length - 1].id : undefined,
        isNext: true,
        userId: userId,
      } as GetSoundsBehaviorData)
    );
    nextPage.setLabel("\u200b");
    nextPage.setEmoji("⏩");
    nextPage.setDisabled(!hasNextPage);
    nextPage.setStyle(ButtonStyle.Secondary);
    row.addComponents(nextPage);

    const lastPage = new ButtonBuilder();
    lastPage.setCustomId(
      JSON.stringify({
        type: "getSounds",
        page: "last",
        isLast: true,
        userId: userId,
      } as GetSoundsBehaviorData)
    );
    lastPage.setLabel("\u200b");
    lastPage.setEmoji("⏭");
    lastPage.setDisabled(!hasLastPage);
    lastPage.setStyle(ButtonStyle.Primary);
    row.addComponents(lastPage);
  }

  return [embed, row!];
};

export default {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("List the sounds have been uploaded")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("server")
        .setDescription("List the sounds have been uploaded on the server")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("user").setDescription("List the sounds you have uploaded")
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.channel;
    const userId = interaction.options.getSubcommand() == "user" ? interaction.user.id : undefined;

    const [embed, row] = await createSoundsEmbed({ page: 1, userId, isFirst: true });

    const collector = interaction.channel?.createMessageComponentCollector({ time: 60000 });

    collector?.on("collect", async (i) => {
      if (!i.isButton()) return;

      if (!isValidJSON(i.customId)) {
        return;
      }

      const behaviorData = JSON.parse(i.customId) as ButtonBehaviorData;

      if (behaviorData.type == "getSounds") {
        await i.deferUpdate();

        const data = behaviorData as GetSoundsBehaviorData;

        const [e, r] = await createSoundsEmbed({
          page: data.page,
          cursor: data.cursor,
          userId: data.userId,
          isFirst: data.isFirst,
          isLast: data.isLast,
          isNext: data.isNext,
          isPrevious: data.isPrevious,
        });
        if (r) {
          // @ts-ignore
          await i.editReply({ embeds: [e], components: [r], ephemeral: true });
        } else {
          // @ts-ignore
          await i.editReply({ embeds: [e], ephemeral: true });
        }
      }
    });

    if (row) {
      // @ts-ignore
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } else {
      // @ts-ignore
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
