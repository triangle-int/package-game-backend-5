import { Injectable } from '@nestjs/common';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatesService } from '../../updates/updates.service';
import { DiscordCommand } from '../discord-command';
import { DiscordService } from '../discord.service';

@Injectable()
export class BanCommand extends DiscordCommand {
  constructor(
    discord: DiscordService,
    private prisma: PrismaService,
    private updates: UpdatesService,
  ) {
    super(discord);
  }

  slashCommand = new SlashCommandBuilder()
    .setName('ban-user')
    .setDescription('Ban user')
    .addStringOption((option) =>
      option
        .setName('nickname')
        .setDescription('User nickname')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Ban reason').setRequired(true),
    );

  async handle(
    interaction: ChatInputCommandInteraction,
    success: (msg: string) => Promise<void>,
    error: (msg: string) => Promise<void>,
  ) {
    const nickname = interaction.options.getString('nickname');
    const reason = interaction.options.getString('reason');

    const user = await this.prisma.user.findUnique({
      where: { nickname },
      include: { ban: true },
    });

    if (user.ban != null) {
      await error(`User ${user.nickname} is already banned!`);
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ban: {
          create: {
            reason,
          },
        },
      },
    });

    this.updates.sendBanUpdate(user.id);
    await success(`User ${nickname} is banned for ${reason}!`);
  }
}
