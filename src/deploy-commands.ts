import { REST, Routes } from "discord.js";
import commands from "./commands";

const commandsList: any = [];

for (const command of commands) {
  commandsList.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(
  process.env.DISCORD_TOKEN as string
);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    const data = await rest.put(
      Routes.applicationGuildCommands(
        process.env.DEPLOY_COMMANDS_APPLICATION_ID as string,
        process.env.DEPLOY_COMMANDS_GUILD_ID as string
      ),
      {
        body: commandsList,
      }
    );

    // @ts-ignore
    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
