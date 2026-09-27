module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'sendmail',
      providerOptions: {
        silent: true,
        devHost: env('SMTP_HOST', 'mailhog'),
        devPort: env.int('SMTP_PORT', 1025),
        logger: {
          debug: console.log,
          info: console.log,
          warn: console.log,
          error: console.log,
        },
      },
      settings: {
        defaultFrom: env('SMTP_FROM', 'no-reply@cybersec.local'),
        defaultReplyTo: env('SMTP_FROM', 'no-reply@cybersec.local'),
      },
    },
  },
});
