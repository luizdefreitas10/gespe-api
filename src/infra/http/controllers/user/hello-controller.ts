import { Public } from '@/infra/auth/public'
import { Controller, Get } from '@nestjs/common'

@Public()
@Controller('/hello')
export class HelloWorldController {
  constructor() {}

  @Get()
  async getUsers() {
    return 'Hello World'
  }
}
