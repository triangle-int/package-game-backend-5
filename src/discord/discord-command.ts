import { ChatInputCommandInteraction } from 'discord.js';
import { DiscordService } from './discord.service';

export abstract class DiscordCommand {
  constructor(discord: DiscordService) {
    discord.addCommand(this);
  }

  abstract slashCommand: any;

  abstract handle(
    interaction: ChatInputCommandInteraction,
    success: (msg: string) => Promise<void>,
    error: (msg: string) => Promise<void>,
  ): Promise<void>;
}
