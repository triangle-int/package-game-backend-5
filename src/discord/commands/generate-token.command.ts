import { Injectable } from '@nestjs/common';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { UserService } from '../../user/user.service';
import { DiscordCommand } from '../discord-command';
import { DiscordService } from '../discord.service';

@Injectable()
export class GenerateTokenCommand extends DiscordCommand {
  constructor(discord: DiscordService, private userService: UserService) {
    super(discord);
  }

  slashCommand = new SlashCommandBuilder()
    .setName('generate-token')
    .setDescription('Generate beta token');

  async handle(
    interaction: ChatInputCommandInteraction,
    success: (msg: string) => Promise<void>,
  ) {
    await success(await this.userService.generateBetaToken());
  }
}
