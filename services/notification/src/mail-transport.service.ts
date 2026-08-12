import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { NotificationConfigService } from './config/notification-config.service';

interface EmailJob {
  to: string;
  subject: string;
  template: string;
  payload: Record<string, string>;
}

@Injectable()
export class MailTransportService {
  private readonly logger = new Logger(MailTransportService.name);
  private readonly transporter;

  constructor(private readonly config: NotificationConfigService) {
    this.transporter = nodemailer.createTransport(this.config.smtpUrl);
  }

  async send(job: EmailJob): Promise<void> {
    const body = this.render(job);
    await this.transporter.sendMail({
      from: this.config.emailFrom,
      to: job.to,
      subject: job.subject,
      text: body,
    });
    this.logger.log(`Sent email to=${job.to} template=${job.template}`);
  }

  private render(job: EmailJob): string {
    if (job.template === 'email-verification') {
      return `Hello ${job.payload.firstName ?? ''},\n\nVerify your email: ${job.payload.verifyUrl ?? ''}\n`;
    }
    if (job.template === 'password-reset') {
      return `Hello ${job.payload.firstName ?? ''},\n\nReset your password: ${job.payload.resetUrl ?? ''}\n`;
    }
    return JSON.stringify(job.payload);
  }
}
