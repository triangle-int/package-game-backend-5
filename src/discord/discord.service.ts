import { Injectable } from '@nestjs/common';
import {
  Routes,
  REST,
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  WebhookClient,
} from 'discord.js';
import { ConfigService } from '@nestjs/config';
import { DiscordCommand } from './discord-command';

@Injectable()
export class DiscordService {
  private commands: DiscordCommand[] = [];

  private weebhookClient: WebhookClient;

  constructor(private config: ConfigService) {
    this.weebhookClient = new WebhookClient({
      id: this.config.get('DISCORD_WEBHOOK_ID'),
      token: this.config.get('DISCORD_WEBHOOK_TOKEN'),
    });

    setTimeout(async () => await this.setupBot(), 1000);
  }

  async sendWarning(title: string, message: string, img: string = null) {
    let embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(message)
      .setColor('Yellow');

    if (img != null) embed = embed.setImage(img);

    await this.weebhookClient.send({
      embeds: [embed],
    });
  }

  private async setupBot() {
    if (this.config.get('RUN_DISCORD') !== 'yes') return;

    const rest = new REST({ version: '10' }).setToken(
      this.config.get('DISCORD_TOKEN'),
    );
    await rest.put(
      Routes.applicationCommands(this.config.get('DISCORD_CLIENT_ID')),
      {
        body: this.commands.map(({ slashCommand }) => slashCommand),
      },
    );

    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const success = async (msg: string) => {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Success!')
              .setDescription(msg)
              .setColor('Green'),
          ],
        });
      };

      const error = async (msg: string) => {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Error!')
              .setDescription(msg)
              .setColor('Red'),
          ],
        });
      };

      try {
        await this.commands
          .find((cmd) => cmd.slashCommand.name === interaction.commandName)
          .handle(interaction, success, error);
      } catch (e) {
        await error(e.toString());
      }
    });

    client.login(this.config.get('DISCORD_TOKEN'));
  }

  addCommand(handler: DiscordCommand) {
    this.commands.push(handler);
  }
}
