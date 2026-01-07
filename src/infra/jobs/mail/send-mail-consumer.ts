// import { EnvService } from '@/infra/env/env.service'
// import { Mails } from '@/infra/mails/mails'
// import { Process, Processor } from '@nestjs/bull'
// import { Job } from 'bull'

// @Processor('send-mail-queue')
// class SendMailConsumer {
//   constructor(
//     private mails: Mails,
//     private envService: EnvService,
//   ) {}

//   @Process('send-mail-recovery-job')
//   async sendMailRecoveryJob(
//     job: Job<{ email: string; confirmationToken: string }>,
//   ) {
//     const { data } = job

//     await this.mails.sendMail({
//       to: data.email,
//       subject: 'Solicitação de Alteração de Senha',
//       template: 'recovery-password',
//       context: {
//         token: data.confirmationToken,
//         clientDomain: this.envService.get('CLIENT_DOMAIN'),
//         serverDomain: this.envService.get('SERVER_DOMAIN'),
//       },
//     })
//   }
// }

// export { SendMailConsumer }
