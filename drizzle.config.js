/** Config para drizzle-kit migrate em produção (sem TypeScript) */
module.exports = {
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/ubus',
  },
};
