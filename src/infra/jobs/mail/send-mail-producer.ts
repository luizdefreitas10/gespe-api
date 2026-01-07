import { InjectQueue } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import { Queue } from 'bull'

@Injectable()
class SendMailProducer {
  constructor(@InjectQueue('send-mail-queue') private mailQueue: Queue) {}

  async sendMailRecovery(email: string, confirmationToken: string) {
    this.mailQueue.add('send-mail-recovery-job', { email, confirmationToken })
  }
}

export { SendMailProducer }
