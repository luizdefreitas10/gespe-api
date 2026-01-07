import { SentMessageInfo } from 'nodemailer'
import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'

export type SendMailProps = {
  to: string
  from?: string
  subject: string
  message?: string
  html?: string | Buffer
  template: string
  context?: { [name: string]: unknown }
}

export type SendEmailErrorProps = {
  responseCode: number
  response: string
}

type SendEmailResponse = Either<
  SendEmailErrorProps,
  {
    response: SentMessageInfo
  }
>

@Injectable()
export class Mails {
  constructor(private mail: MailerService) {}

  async sendMail({
    to,
    from = '"Grupo Sina" <geral@gruposina.com>',
    subject,
    message,
    html,
    template,
    context,
  }: SendMailProps): Promise<SendEmailResponse> {
    try {
      const response = await this.mail.sendMail({
        to,
        from,
        subject,
        text: message,
        template,
        html,
        context,
      })
      // console.log(response)
      return right({ response })
    } catch (error) {
      console.log(error)
      return left(error as SendEmailErrorProps)
    }
  }
}
