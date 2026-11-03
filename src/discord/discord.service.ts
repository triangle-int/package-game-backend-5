import { Injectable, Logger } from '@nestjs/common';
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

  private webhookClient?: WebhookClient;
  private readonly logger = new Logger(DiscordService.name);

  constructor(private config: ConfigService) {
    const id = this.config.get<string>('DISCORD_WEBHOOK_ID');
    const token = this.config.get<string>('DISCORD_WEBHOOK_TOKEN');
    const enabled = this.config.get('RUN_DISCORD') === 'yes';
    if (enabled && id && token) {
      this.webhookClient = new WebhookClient({ id, token });
    } else if (enabled) {
      this.logger.warn(
        'Discord webhook is not configured; anticheat warnings will be skipped.',
      );
    }

    setTimeout(async () => await this.setupBot(), 1000);
  }

  async sendWarning(title: string, message: string, img: string = null) {
    let embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(message)
      .setColor('Yellow');

    if (img != null) embed = embed.setImage(img);

    if (!this.webhookClient) return;
    try {
      await this.webhookClient.send({ embeds: [embed] });
    } catch (error) {
      this.logger.warn(`Unable to send Discord warning: ${error}`);
    }
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
