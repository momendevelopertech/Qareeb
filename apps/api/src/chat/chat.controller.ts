import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { NearestChatDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('nearest')
    findNearest(@Body() body: NearestChatDto) {
        return this.chatService.findNearest(body.text, body.lat, body.lng);
    }
}
