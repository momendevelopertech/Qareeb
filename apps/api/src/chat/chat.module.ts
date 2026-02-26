import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchModule } from '../search/search.module';

@Module({
    imports: [PrismaModule, SearchModule],
    providers: [ChatService],
    controllers: [ChatController],
})
export class ChatModule { }
