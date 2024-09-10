import { VoiceBasedChannel, Guild } from "discord.js";
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  demuxProbe,
  joinVoiceChannel,
} from "@discordjs/voice";
import prisma from "../services/prisma";
import path from "node:path";
import { createReadStream } from "node:fs";

const basePath = process.cwd();

const playlist: {
  channel: VoiceBasedChannel;
  fc: (...args: any[]) => Promise<void>;
}[] = [];

const player = createAudioPlayer();

const guessAndCreateAudioResource = async (str: string) => {
  const { stream, type } = await demuxProbe(createReadStream(str));

  return createAudioResource(stream, { inputType: type });
};

const consumeSound = async (
  soundName: string,
  channel: VoiceBasedChannel,
  guild: Guild,
  mute = true
) => {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });

  const server = await prisma.server.findUnique({ where: { id: guild.id } });
  const victims = server ? server.victims : [];

  if (mute && victims.length > 0) {
    // Mute first the user non victim
    await Promise.all(
      channel.members.map(async (member) => {
        const isVictim = victims.indexOf(member.user.id) >= 0;
        if (!member.user.bot && !isVictim) {
          await member.voice.setMute(true);
        }
      })
    );

    // then mute the victims
    await Promise.all(
      channel.members.map(async (member) => {
        const isVictim = victims.indexOf(member.user.id) >= 0;
        if (isVictim) {
          await member.voice.setDeaf(false);
        }
      })
    );
  }

  // const resource = createAudioResource(`/app/sounds/${soundName}`);
  const resource = await guessAndCreateAudioResource(path.join(basePath, "sounds", soundName));

  connection.subscribe(player);
  player.removeAllListeners(AudioPlayerStatus.Idle);

  player.once(AudioPlayerStatus.Idle, async () => {
    const nextSound = playlist.length >= 2 ? playlist[1] : null;

    let shouldUnmute = true;
    if (nextSound && nextSound.channel.id == channel.id) {
      shouldUnmute = false;
    }

    if (shouldUnmute && victims.length > 0) {
      await Promise.all(
        channel.members.map(async (member) => {
          const isVictim = victims.indexOf(member.user.id) >= 0;
          if (isVictim) {
            await member.voice.setDeaf(true);
          }
        })
      );

      await Promise.all(
        channel.members.map(async (member) => {
          const isVictim = victims.indexOf(member.user.id) >= 0;
          if (!member.user.bot && !isVictim) {
            await member.voice.setMute(false);
          }
        })
      );
    }

    playlist.shift();

    if (nextSound) {
      nextSound.fc(shouldUnmute);
    }
  });
  ////
  player.play(resource);
};

export const playSound = (soundName: string, channel: VoiceBasedChannel, guild: Guild) => {
  const playFunction = consumeSound.bind(null, soundName, channel, guild);

  if (playlist.length == 0) {
    playFunction();
  }

  playlist.push({ channel, fc: playFunction });
};
