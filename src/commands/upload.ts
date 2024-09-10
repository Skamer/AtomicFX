import fs from "fs";
import https from "https";
import prisma from "../services/prisma";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import path from "node:path";

const basePath = process.cwd();

const downloadFile = async (url: string, targetFile: string) => {
  return await new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const code = response.statusCode ?? 0;

        if (code >= 400) {
          return reject(new Error(response.statusMessage));
        }

        // handle redirects
        if (code > 300 && code < 400 && !!response.headers.location) {
          return resolve(downloadFile(response.headers.location, targetFile));
        }

        // save the file to disk
        const fileWritter = fs.createWriteStream(targetFile).on("finish", () => resolve({}));

        response.pipe(fileWritter);
      })
      .on("error", (error) => reject(error));
  });
};

export default {
  data: new SlashCommandBuilder()
    .setName("upload")
    .setDescription("Upload a sound")
    .addStringOption((option) =>
      option.setName("name").setDescription("name to upload the file").setRequired(true)
    )
    .addAttachmentOption((option) =>
      option.setName("file").setDescription("Sound file").setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("name");
    const file = interaction.options.getAttachment("file");
    const member = interaction.member;
    const guild = interaction.guild;

    if (name && file && member && guild) {
      const sound = await prisma.sound.create({
        data: {
          name: name,
          uploaderId: member.user.id,
          server: {
            connectOrCreate: {
              create: {
                id: guild.id,
              },
              where: {
                id: guild.id,
              },
            },
          },
        },
      });

      await downloadFile(file.url, path.join(basePath, "sounds", `sound-${sound.id}`));
    }

    await interaction.reply({ content: "Upload the sound", ephemeral: true });
  },
};
