// import { MailerModule } from '@nestjs-modules/mailer'
// import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter'
// import { Module } from '@nestjs/common'

// import { EnvService } from '../env/env.service'
// import { EnvModule } from '../env/env.module'
// import { Mails } from './mails'
// import { ServeStaticModule } from '@nestjs/serve-static'

// @Module({
//   imports: [
//     ServeStaticModule.forRoot({
//       rootPath: `${process.cwd()}/src/infra/mails/templates/assets`,
//     }),
//     MailerModule.forRootAsync({
//       imports: [EnvModule],
//       inject: [EnvService],

//       useFactory: (env: EnvService) => ({
//         template: {
//           dir: `${process.cwd()}/src/infra/mails/templates`,
//           adapter: new HandlebarsAdapter(),
//           options: {
//             strict: true,
//             extName: '.hbs',
//             layoutsDir: `${process.cwd()}/src/infra/mails/templates`,
//           },
//         },

//         transport: {
//           host: env.get('MAIL_HOST'),
//           secure: false,
//           port: env.get('MAIL_PORT'),
//           auth: {
//             user: env.get('MAIL_USER'),
//             pass: env.get('MAIL_PASSWORD'),
//           },
//         },
//         defaults: {
//           from: 'yuri-sina@zohomail.com',
//         },
//       }),
//     }),
//   ],

//   providers: [Mails, EnvService],
//   exports: [Mails],
// })
// export class MailsModule {}
