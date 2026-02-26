import { Controller, Post, Body, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { NearestChatDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('nearest')
    findNearest(@Body() body: NearestChatDto, @Req() _req: any) {
        return this.chatService.findNearest(body.text, body.lat, body.lng);
    }
}
