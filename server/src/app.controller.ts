import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('agent')
export class AppController {
  constructor(private readonly appService: AppService) {}

  // @Get()
  // getHello(): string {
  //   return this.appService.getHello();
  // }
  @Post('chat')
  async chat(@Body('message') message: string) {
    const reply = await this.appService.chat(message);
    return { reply };
  }
}
