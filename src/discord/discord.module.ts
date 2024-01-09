import { Global, Module } from '@nestjs/common';
import { BanCommand } from './commands/ban.command';
import { GenerateTokenCommand } from './commands/generate-token.command';
import { PardonCommand } from './commands/pardon.command';
import { DiscordService } from './discord.service';

@Global()
@Module({
  providers: [GenerateTokenCommand, BanCommand, PardonCommand, DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
