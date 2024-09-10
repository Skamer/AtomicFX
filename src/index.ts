import { Client, Collection, Events, GatewayIntentBits, Interaction } from "discord.js";
import cmdList from "./commands";
import { isValidJSON } from "./utils";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const commands = new Collection<string, any>();
const buttonInteractions: any[] = [];

for (const cmd of cmdList) {
  commands.set(cmd.data.name, cmd);

  // @ts-ignore
  if (cmd.executeButton) {
    // @ts-ignore
    buttonInteractions.push(cmd.executeButton);
  }
}

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isAutocomplete() && !interaction.isButton())
    return;

  if (interaction.isChatInputCommand() || interaction.isAutocomplete()) {
    const command = commands.get(interaction.commandName);

    if (!command) return;

    if (interaction.isChatInputCommand()) {
      try {
        await command.execute(interaction);
      } catch {}
    } else if (interaction.isAutocomplete()) {
      if (command.autocomplete) {
        try {
          await command.autocomplete(interaction);
        } catch {}
      }
    }
  } else if (interaction.isButton() && buttonInteractions.length > 0) {
    // const path = interaction.customId.split(" | ");
    // const execType = path.shift();

    if (interaction.customId == "none") {
      await interaction.deferUpdate();
      return;
    } else if (isValidJSON(interaction.customId)) {
      try {
        const data = JSON.parse(interaction.customId);
        for (const executeButton of buttonInteractions) {
          executeButton(interaction, data);
        }
      } catch {}
    }
  }
});

client.login(process.env.DISCORD_ENV);
