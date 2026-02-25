import { Controller, Post, Body, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { NearestChatDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('nearest')
    findNearest(@Body() body: NearestChatDto, @Req() req: any) {
        const locale = (req?.headers['accept-language'] || '').startsWith('ar') ? 'ar' : 'en';
        return this.chatService.findNearest(body.text, body.lat, body.lng, locale);
    }
}
