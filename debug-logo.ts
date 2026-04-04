
import { EmailService } from './src/shared/email/email.service';
import { ConfigService } from '@nestjs/config';

async function debug() {
  const emailService = new EmailService({ get: () => 'localhost' } as any);
  const layout = (emailService as any).getEmailLayout('test', 'test');
  const match = layout.match(/data:image\/svg\+xml;base64,([a-zA-Z0-9+/=]+)/);
  if (match) {
    const base64 = match[1];
    try {
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      if (decoded.startsWith('<svg') && decoded.endsWith('</svg>')) {
        console.log('SVG is valid and starts/ends correctly.');
      } else {
        console.log('SVG is INVALID.');
        console.log('Starts with:', decoded.slice(0, 20));
        console.log('Ends with:', decoded.slice(-20));
      }
    } catch (e) {
      console.log('FAILED TO DECODE:', e.message);
    }
  } else {
    console.log('Logo not found in layout.');
  }
}

debug();
